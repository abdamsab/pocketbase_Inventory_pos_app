import { useInfiniteQuery } from '@tanstack/react-query';
import { pbValidated } from '../lib/pocketbase';
import type { PocketBaseOptions } from '../lib/pocketbase';

interface UsePaginatedProductsOptions {
  pageSize?: number;
  sort?: string;
  filter?: string;
  expand?: string;
}

interface PaginatedProductsPage {
  data: unknown[];
  nextPage: number | null;
  totalPages: number;
  totalItems: number;
  currentPage: number;
}

export function usePaginatedProducts(options: UsePaginatedProductsOptions = {}) {
  const {
    pageSize = 50,
    sort = '-created',
    filter,
    expand = 'category'
  } = options;

  return useInfiniteQuery({
    queryKey: ['products', 'paginated', { pageSize, sort, filter, expand }],
    initialPageParam: 1,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const pbOptions: PocketBaseOptions = {
        sort,
        expand,
      };

      if (filter) {
        pbOptions.filter = filter;
      }

      const result = await pbValidated.getProductsPaginated(pageParam, pageSize, pbOptions);

      return {
        data: result.items,
        nextPage: result.totalPages > pageParam ? pageParam + 1 : null,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        currentPage: pageParam,
      };
    },
    getNextPageParam: (lastPage: PaginatedProductsPage) => lastPage.nextPage,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

// Hook for searching products with pagination
export function useSearchProducts(searchTerm: string, options: UsePaginatedProductsOptions = {}) {
  const filter = searchTerm
    ? `name~"${searchTerm}"||sku~"${searchTerm}"||barcode~"${searchTerm}"`
    : undefined;

  return usePaginatedProducts({
    ...options,
    filter,
  });
}