import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  onEndReached?: () => void;
  endThreshold?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5,
  onEndReached,
  endThreshold = 0.8,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );

    // Add overscan for smoother scrolling
    const overscanStart = Math.max(0, startIndex - overscan);
    const overscanEnd = Math.min(items.length - 1, endIndex + overscan);

    return {
      start: overscanStart,
      end: overscanEnd,
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }));
  }, [items, visibleRange]);

  // Calculate total height and offset
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);

    // Check if we've reached the end threshold
    if (onEndReached) {
      const scrollHeight = e.currentTarget.scrollHeight;
      const scrollPosition = newScrollTop + containerHeight;
      const threshold = scrollHeight * endThreshold;

      if (scrollPosition >= threshold) {
        onEndReached();
      }
    }
  }, [containerHeight, onEndReached, endThreshold]);

  // Reset scroll when items change significantly
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{
                height: itemHeight,
                position: 'absolute',
                top: (index - visibleRange.start) * itemHeight,
                left: 0,
                right: 0,
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// Performance optimized table row renderer for virtual lists
export function VirtualTableRow<T>({
  item,
  index,
  columns,
  onClick,
  className = '',
}: {
  item: T;
  index: number;
  columns: Array<{
    key: keyof T | string;
    render?: (item: T, index: number) => React.ReactNode;
    width?: number;
  }>;
  onClick?: (item: T, index: number) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex border-b border-border hover:bg-surfaceHighlight transition-colors ${className} ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={() => onClick?.(item, index)}
    >
      {columns.map((column) => (
        <div
          key={String(column.key)}
          className="px-4 py-3 flex items-center"
          style={{ width: column.width, flex: column.width ? 'none' : 1 }}
        >
          {column.render
            ? column.render(item, index)
            : String((item as Record<string, unknown>)[String(column.key)] || '')
          }
        </div>
      ))}
    </div>
  );
}

// Specialized virtual list for tables
export function VirtualTable<T>({
  items,
  columns,
  rowHeight = 60,
  containerHeight,
  onRowClick,
  className = '',
  headerClassName = '',
}: {
  items: T[];
  columns: Array<{
    key: keyof T | string;
    header: string;
    render?: (item: T, index: number) => React.ReactNode;
    width?: number;
  }>;
  rowHeight?: number;
  containerHeight: number;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
  headerClassName?: string;
}) {
  const renderItem = useCallback((item: T, index: number) => (
    <VirtualTableRow
      key={index}
      item={item}
      index={index}
      columns={columns}
      onClick={onRowClick}
    />
  ), [columns, onRowClick]);

  return (
    <div className={`border border-border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`flex bg-surfaceHighlight border-b border-border ${headerClassName}`}>
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className="px-4 py-3 font-medium text-text-main text-sm"
            style={{ width: column.width, flex: column.width ? 'none' : 1 }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtual List Body */}
      <VirtualList
        items={items}
        itemHeight={rowHeight}
        containerHeight={containerHeight - 60} // Subtract header height
        renderItem={renderItem}
        className="flex-1"
      />
    </div>
  );
}