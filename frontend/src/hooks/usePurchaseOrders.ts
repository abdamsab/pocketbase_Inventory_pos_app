import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import type { PurchaseOrder, PurchaseOrderItem, Inventory } from '../types';
import { useLocation } from '../contexts/LocationContext';
import { useAuthStore } from '../stores/authStore';

export function usePurchaseOrders() {
    const { activeLocation, user: authUser } = useAuthStore(); // Try to get user if needed for filtering
    // Actually useLocation hook is used in original code.
    const { activeLocation: loc } = useLocation();

    return useQuery({
        queryKey: ['purchase_orders', loc === 'all' ? 'all' : loc?.id],
        queryFn: async () => {
            if (!loc) return [];

            let filter = '';
            if (loc !== 'all') {
                filter = `location="${loc.id}"`;
            }

            const result = await pb.collection('purchase_orders').getList<PurchaseOrder>(1, 100, {
                sort: '-po_number',
                filter,
                expand: 'supplier'
            });
            return result.items;
        },
        enabled: !!loc
    });
}

export function usePurchaseOrder(id: string) {
    return useQuery({
        queryKey: ['purchase_orders', id],
        queryFn: async () => {
            return await pb.collection('purchase_orders').getOne<PurchaseOrder>(id, {
                expand: 'supplier,created_by,location',
            });
        },
        enabled: !!id,
    });
}

export function usePurchaseOrderItems(poId: string) {
    return useQuery({
        queryKey: ['purchase_order_items', poId],
        queryFn: async () => {
            return await pb.collection('purchase_order_items').getFullList<PurchaseOrderItem>({
                filter: `purchase_order="${poId}"`,
                expand: 'product',
            });
        },
        enabled: !!poId,
    });
}

export function useCreatePurchaseOrder() {
    const queryClient = useQueryClient();
    const { activeLocation } = useLocation();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async (data: { po: Partial<PurchaseOrder>; items: Partial<PurchaseOrderItem>[] }) => {
            if (!activeLocation) throw new Error("Missing location context");
            if (activeLocation === 'all') throw new Error("Please select a specific location to create a Purchase Order.");

            if (!user) throw new Error("Missing user context");

            const createdPO = await pb.collection('purchase_orders').create({
                ...data.po,
                location: activeLocation.id,
                user: user.id,
                created_by: user.id,
                status: 'draft'
            });

            for (const item of data.items) {
                await pb.collection('purchase_order_items').create({
                    ...item,
                    purchase_order: createdPO.id,
                });
            }

            return createdPO;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
        },
    });
}

export function useUpdatePurchaseOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<PurchaseOrder> }) => {
            return await pb.collection('purchase_orders').update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
        },
    });
}

export function useReceivePurchaseOrder() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async ({ poId, items }: { poId: string; items: { id: string; quantityReceived: number }[] }) => {
            const po = await pb.collection('purchase_orders').getOne(poId);
            const locationId = po.location; // Must receive into the PO's location

            // Update each item's received quantity and Inventory
            for (const item of items) {
                const poItem = await pb.collection('purchase_order_items').getOne(item.id, { expand: 'product' });

                // 1. Update PO Item
                await pb.collection('purchase_order_items').update(item.id, {
                    quantity_received: (poItem.quantity_received || 0) + item.quantityReceived,
                });

                // 2. Update Inventory (or create if missing)
                let inventoryRecord: Inventory;
                try {
                    inventoryRecord = await pb.collection('inventory').getFirstListItem(`product="${poItem.product}" && location="${locationId}"`) as Inventory;
                    // Update existing
                    await pb.collection('inventory').update(inventoryRecord.id, {
                        quantity: inventoryRecord.quantity + item.quantityReceived
                    });
                } catch (e) {
                    // Create new
                    // Getting default reorder point from product if possible, else 10
                    const product = await pb.collection('products').getOne(poItem.product);
                    inventoryRecord = await pb.collection('inventory').create({
                        product: poItem.product,
                        location: locationId,
                        quantity: item.quantityReceived,
                        reorder_point: product.reorder_point || 10
                    }) as Inventory;
                }

                // 3. Create Inventory Entry (Log)
                await pb.collection('inventory_entries').create({
                    product: poItem.product,
                    location: locationId,
                    user: user?.id,
                    type: 'purchase',
                    quantity: item.quantityReceived,
                    reference_id: po.po_number,
                    notes: `Received from PO #${po.po_number}`,
                    created: new Date().toISOString(),
                    updated: new Date().toISOString()
                });
            }

            // Update PO status
            const poItems = await pb.collection('purchase_order_items').getFullList({
                filter: `purchase_order="${poId}"`,
            });
            const allReceived = poItems.every(item => item.quantity_received >= item.quantity_ordered);
            const someReceived = poItems.some(item => item.quantity_received > 0);

            return await pb.collection('purchase_orders').update(poId, {
                status: allReceived ? 'received' : someReceived ? 'partial' : po.status,
                received_date: allReceived ? new Date().toISOString() : po.received_date,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            queryClient.invalidateQueries({ queryKey: ['purchase_order_items'] });
            queryClient.invalidateQueries({ queryKey: ['products'] }); // Refetch products to get new aggregated stock if needed
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
    });
}
