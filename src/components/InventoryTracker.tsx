import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface InventoryTrackerProps {
  supplierId?: Id<"suppliers">;
  category?: string;
  itemName?: string;
}

interface InventoryItem {
  _id: Id<"inventory">;
  supplierId: Id<"suppliers">;
  itemName: string;
  category: string;
  currentStock: number;
  unit: string;
  pricePerUnit: number;
  minimumOrder: number;
  quality: string;
  expiryDate?: number;
  lastUpdated: number;
  isAvailable: boolean;
}

const InventoryTracker: React.FC<InventoryTrackerProps> = ({
  supplierId,
  category,
  itemName
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'updated'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterAvailable, setFilterAvailable] = useState(true);

  // Fetch inventory based on props
  const inventoryBySupplier = useQuery(
    api.inventory.getInventoryBySupplier,
    supplierId ? { supplierId } : "skip"
  );

  const inventoryByCategory = useQuery(
    api.inventory.getInventoryByCategory,
    category ? { category } : "skip"
  );

  const inventoryByItem = useQuery(
    api.inventory.getInventoryByItem,
    itemName ? { itemName } : "skip"
  );

  const allInventory = useQuery(api.inventory.getAvailableInventory, {});

  // Determine which inventory data to use
  const rawInventory = useMemo(() => {
    if (supplierId && inventoryBySupplier) return inventoryBySupplier;
    if (category && inventoryByCategory) return inventoryByCategory;
    if (itemName && inventoryByItem) return inventoryByItem;
    return allInventory || [];
  }, [supplierId, category, itemName, inventoryBySupplier, inventoryByCategory, inventoryByItem, allInventory]);

  // Filter and sort inventory
  const processedInventory = useMemo(() => {
    let filtered = rawInventory;

    if (filterAvailable) {
      filtered = filtered.filter(item => item.isAvailable);
    }

    // Sort inventory
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.itemName.toLowerCase();
          bValue = b.itemName.toLowerCase();
          break;
        case 'price':
          aValue = a.pricePerUnit;
          bValue = b.pricePerUnit;
          break;
        case 'stock':
          aValue = a.currentStock;
          bValue = b.currentStock;
          break;
        case 'updated':
          aValue = a.lastUpdated;
          bValue = b.lastUpdated;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return sorted;
  }, [rawInventory, sortBy, sortOrder, filterAvailable]);

  const getStockStatus = (item: InventoryItem) => {
    if (!item.isAvailable) return 'out-of-stock';
    if (item.currentStock <= item.minimumOrder) return 'low-stock';
    return 'in-stock';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'out-of-stock': return 'text-red-600 bg-red-50';
      case 'low-stock': return 'text-yellow-600 bg-yellow-50';
      case 'in-stock': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatLastUpdated = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (!rawInventory) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Inventory Tracker
          </h2>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filterAvailable}
                onChange={(e) => setFilterAvailable(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">Available only</span>
            </label>
            <div className="text-sm text-gray-500">
              {processedInventory.length} items
            </div>
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex space-x-2">
          {[
            { key: 'updated', label: 'Last Updated' },
            { key: 'name', label: 'Name' },
            { key: 'price', label: 'Price' },
            { key: 'stock', label: 'Stock' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSort(key as typeof sortBy)}
              className={`px-3 py-1 text-sm rounded-md border ${
                sortBy === key
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
              {sortBy === key && (
                <span className="ml-1">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quality
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedInventory.map((item) => {
              const stockStatus = getStockStatus(item);
              return (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.itemName}
                    </div>
                    <div className="text-sm text-gray-500">
                      Min order: {item.minimumOrder} {item.unit}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.currentStock} {item.unit}
                    </div>
                    {stockStatus === 'low-stock' && (
                      <div className="text-xs text-yellow-600">
                        Low stock warning
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ₹{item.pricePerUnit.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      per {item.unit}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {item.quality}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatLastUpdated(item.lastUpdated)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(stockStatus)}`}>
                      {stockStatus === 'out-of-stock' && 'Out of Stock'}
                      {stockStatus === 'low-stock' && 'Low Stock'}
                      {stockStatus === 'in-stock' && 'In Stock'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {processedInventory.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-2">No inventory items found</div>
            <div className="text-gray-400 text-sm">
              {filterAvailable ? 'Try unchecking "Available only" filter' : 'No items match your criteria'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryTracker;