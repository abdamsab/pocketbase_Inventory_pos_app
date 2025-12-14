import { useState, useMemo } from 'react';

// Hook for managing virtual list state
export function useVirtualList<T>(items: T[], options: {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / options.itemHeight);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + options.containerHeight) / options.itemHeight)
    );

    const overscan = options.overscan || 5;
    const overscanStart = Math.max(0, startIndex - overscan);
    const overscanEnd = Math.min(items.length - 1, endIndex + overscan);

    return {
      start: overscanStart,
      end: overscanEnd,
    };
  }, [scrollTop, options.itemHeight, options.containerHeight, items.length, options.overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * options.itemHeight;
  const offsetY = visibleRange.start * options.itemHeight;

  const scrollToIndex = (index: number) => {
    const targetScrollTop = index * options.itemHeight;
    setScrollTop(targetScrollTop);
  };

  const scrollToTop = () => {
    setScrollTop(0);
  };

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    offsetY,
    scrollTop,
    setScrollTop,
    scrollToIndex,
    scrollToTop,
  };
}