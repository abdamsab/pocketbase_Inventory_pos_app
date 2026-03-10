import { useQuery } from '@tanstack/react-query';
import { pb } from '../lib/pocketbase';
import type { Inventory as InventoryRecord, Product, Location } from '../types';

export interface InventoryItem {
  product: Product;
  locations: {
    location: Location;
    quantity: number;
    reorder_point: number;
    inventoryId: string;
  }[];
  totalStock: number;
  lowStockLocations: string[];
}

export function useInventory() {
  return useQuery({
    queryKey: ['inventory-breakdown'],
    queryFn: async (): Promise<InventoryItem[]> => {
      // Fetch all inventory records with expanded product and location
      const inventoryRecords = await pb.collection('inventory').getFullList<InventoryRecord>({
        expand: 'product,location',
        sort: 'product.name',
      });

      // Group by product
      const productMap = new Map<string, InventoryItem>();

      for (const record of inventoryRecords) {
        const product = record.expand?.product as Product;
        const location = record.expand?.location as Location;

        if (!product || !location) continue;

        const productId = product.id;

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product,
            locations: [],
            totalStock: 0,
            lowStockLocations: [],
          });
        }

        const inventoryItem = productMap.get(productId)!;

        // Add location data
        inventoryItem.locations.push({
          location,
          quantity: record.quantity,
          reorder_point: record.reorder_point,
          inventoryId: record.id,
        });

        // Update total stock
        inventoryItem.totalStock += record.quantity;

        // Check for low stock
        if (record.quantity <= record.reorder_point) {
          inventoryItem.lowStockLocations.push(location.name);
        }
      }

      // Convert map to array and sort by product name
      return Array.from(productMap.values()).sort((a, b) =>
        a.product.name.localeCompare(b.product.name)
      );
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}