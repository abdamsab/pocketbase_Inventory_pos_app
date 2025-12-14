import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import type { PurchaseOrder, PurchaseOrderItem } from '../types';

export function usePurchaseOrders() {
    return useQuery({
        queryKey: ['purchase_orders'],
        queryFn: async () => {
            const result = await pb.collection('purchase_orders').getList<PurchaseOrder>(1, 100, {
                sort: '-po_number', // Sort by po_number instead of created
            });
            return result.items;
        },
    });
}

export function usePurchaseOrder(id: string) {
    return useQuery({
        queryKey: ['purchase_orders', id],
        queryFn: async () => {
            return await pb.collection('purchase_orders').getOne<PurchaseOrder>(id, {
                expand: 'supplier,created_by',
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

    return useMutation({
        mutationFn: async (data: { po: Partial<PurchaseOrder>; items: Partial<PurchaseOrderItem>[] }) => {
            const createdPO = await pb.collection('purchase_orders').create(data.po);

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

    return useMutation({
        mutationFn: async ({ poId, items }: { poId: string; items: { id: string; quantityReceived: number }[] }) => {
            // Update each item's received quantity
            for (const item of items) {
                const poItem = await pb.collection('purchase_order_items').getOne(item.id, { expand: 'product' });
                await pb.collection('purchase_order_items').update(item.id, {
                    quantity_received: item.quantityReceived,
                });

                // Update product stock
                const product = await pb.collection('products').getOne(poItem.product);
                await pb.collection('products').update(poItem.product, {
                    stock: product.stock + item.quantityReceived,
                });
            }

            // Update PO status
            const po = await pb.collection('purchase_orders').getOne(poId);
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
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}
