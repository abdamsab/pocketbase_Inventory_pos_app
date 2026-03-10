import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import type { Product, Inventory } from '../types';
import { useLocation } from '../contexts/LocationContext';
import { useAuthStore } from '../stores/authStore';

// Helper to get inventory for a location
const fetchLocationInventory = async (locationId: string) => {
    try {
        const records = await pb.collection('inventory').getFullList<Inventory>({
            filter: `location="${locationId}"`,
        });
        return records;
    } catch (e) {
        console.error("Failed to fetch inventory", e);
        return [];
    }
}

export function useProducts() {
    const queryClient = useQueryClient();
    const { activeLocation } = useLocation();

    const query = useQuery({
        queryKey: ['products', activeLocation], // Invalidates when location changes
        queryFn: async () => {
            // 1. Fetch all products
            const products = await pb.collection('products').getList<Product>(1, 100, {
                sort: '-name',
            });

            // 2. Fetch Inventory
            let inventoryMap = new Map<string, Inventory[]>();

            // "Active Location" handling
            if (activeLocation === 'all') {
                // Fetch ALL inventory for ALL locations (visible to user)
                // Filter? If superuser, fetch all. If manager, fetch for their locations.
                // Assuming "products list" should show total stock for available locations.
                try {
                    // Ideally we filter inventory by locations user has access to, 
                    // but for "Global" view, usually we just fetch all inventory if admin/superuser.
                    // Let's assume 'all' implies global view.
                    const allInventory = await pb.collection('inventory').getFullList<Inventory>();

                    // Group by product
                    allInventory.forEach(item => {
                        const existing = inventoryMap.get(item.product) || [];
                        existing.push(item);
                        inventoryMap.set(item.product, existing);
                    });
                } catch (e) {
                    console.error("Failed to fetch global inventory", e);
                }

            } else if (activeLocation && typeof activeLocation === 'object') {
                // Specific Location
                const inventoryItems = await fetchLocationInventory(activeLocation.id);
                inventoryItems.forEach(item => {
                    inventoryMap.set(item.product, [item]);
                });
            }

            // 3. Merge stock data
            const mergedItems = products.items.map(product => {
                const invList = inventoryMap.get(product.id) || [];

                // Aggregate quantity
                const totalStock = invList.reduce((sum, inv) => sum + inv.quantity, 0);

                // Use the reorder point from the first finding, or default
                const reorder = invList.length > 0 ? invList[0].reorder_point : (product.reorder_point || 10);

                return {
                    ...product,
                    stock: totalStock, // Aggregated or Local
                    reorder_point: reorder,
                    inventoryId: invList.length === 1 ? invList[0].id : undefined // Only valid for single location
                };
            });
            return mergedItems;
        },
        enabled: !useLocation().isLoading // Wait for location to load
    });

    const createMutation = useMutation({
        mutationFn: async (data: FormData) => {
            return await pb.collection('products').create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
            return await pb.collection('products').update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await pb.collection('products').delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });

    return {
        ...query,
        createProduct: createMutation.mutateAsync,
        updateProduct: updateMutation.mutateAsync,
        deleteProduct: deleteMutation.mutateAsync,
    };
}

export function useAddToInventory() {
    const queryClient = useQueryClient();
    const { activeLocation, availableLocations } = useLocation();
    const { user } = useAuthStore();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            const selectedLocationId = formData.get('location')?.toString();

            // If no location in form, try using activeLocation if it's a specific location
            let finalLocationId = selectedLocationId;
            if (!finalLocationId) {
                if (activeLocation && activeLocation !== 'all') {
                    finalLocationId = activeLocation.id;
                } else {
                    throw new Error("Please select a specific location for this inventory.");
                }
            }

            if (!finalLocationId) throw new Error("No location determined");

            // Validate user has permission to selected location
            const hasPermission = availableLocations.some(loc => loc.id === finalLocationId);
            if (!hasPermission) throw new Error("No permission to manage inventory in selected location");

            const selectedLocation = availableLocations.find(loc => loc.id === finalLocationId);
            if (!selectedLocation) throw new Error("Selected location not found");

            const sku = formData.get('sku')?.toString();
            if (!sku) throw new Error('SKU is required');

            const additionalStock = parseInt(formData.get('stock')?.toString() || '0');
            const costPrice = parseFloat(formData.get('cost_price')?.toString() || '0');
            const salePrice = parseFloat(formData.get('sale_price')?.toString() || '0');

            // Check if product exists by SKU
            const existingProducts = await pb.collection('products').getFullList({
                filter: `sku="${sku}"`
            });

            let product;
            let inventoryNotes;
            let inventoryRecord: Inventory | null = null;


            if (existingProducts.length > 0) {
                // UPDATE existing product
                const existingProduct = existingProducts[0];
                productIdForInventory = existingProduct.id;

                // Fetch existing inventory for this location (NOT product stock)
                try {
                    inventoryRecord = await pb.collection('inventory').getFirstListItem(`product="${existingProduct.id}" && location="${selectedLocation.id}"`) as Inventory;
                } catch (e) {
                    // Not found, will create
                }

                const currentStock = inventoryRecord ? inventoryRecord.quantity : 0;
                const newStock = currentStock + additionalStock;

                // Update product metadata (cost/sale price)
                const updateData: any = {};
                if (costPrice > 0) updateData.cost_price = costPrice;
                if (salePrice > 0) updateData.sale_price = salePrice;

                if (Object.keys(updateData).length > 0) {
                    await pb.collection('products').update(existingProduct.id, updateData);
                }
                product = existingProduct;

                // Update or Create Inventory
                if (inventoryRecord) {
                    await pb.collection('inventory').update(inventoryRecord.id, {
                        quantity: newStock
                    });
                } else {
                    inventoryRecord = await pb.collection('inventory').create({
                        product: existingProduct.id,
                        location: selectedLocation.id,
                        quantity: newStock,
                        reorder_point: 10 // default
                    }) as Inventory;
                }

                inventoryNotes = `Stock update: ${existingProduct.name} (+${additionalStock}) at ${selectedLocation.name}`;
            } else {
                // CREATE new product
                // Remove stock from product creation payload, save it for inventory
                const productData = new FormData();
                // Copy all except stock/reorder
                for (const [key, value] of formData.entries()) {
                    if (key !== 'stock') productData.append(key, value);
                }
                // Need to ensure stock field is ignored or set to 0 in product schema if required
                // Schema says optional.

                product = await pb.collection('products').create(productData);

                // Create initial inventory
                inventoryRecord = await pb.collection('inventory').create({
                    product: product.id,
                    location: selectedLocation.id,
                    quantity: additionalStock,
                    reorder_point: parseInt(formData.get('reorder_point')?.toString() || '10')
                }) as Inventory;

                inventoryNotes = `Initial stock for new product: ${formData.get('name')}`;
            }

            // Create inventory entry for audit trail
            if (additionalStock !== 0) {
                const now = new Date().toISOString();

                // For audit, if activeLocation is 'all', we use the actual location where stock was added
                const locationForAudit = selectedLocation.id;

                await pb.collection('inventory_entries').create({
                    product: product.id,
                    location: locationForAudit,
                    user: user?.id,
                    type: 'purchase', // Assuming "Add to Inventory" is usually a purchase/restock
                    quantity: additionalStock,
                    reference_id: sku,
                    notes: inventoryNotes,
                    created: now,
                    updated: now,
                });
            }

            return product;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-entries'] });
        },
    });
}
