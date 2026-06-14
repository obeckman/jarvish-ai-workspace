import { describe, expect, it } from 'vitest';

import { checkInventory } from '@/backend/services/tools/inventory.service';

describe('inventory tool service', () => {
  it('reports in-stock inventory', async () => {
    await expect(checkInventory({ sku: 'SHOE-123' })).resolves.toBe('In stock: 42 items available.');
  });

  it('reports out-of-stock inventory', async () => {
    await expect(checkInventory({ sku: 'SHIRT-456' })).resolves.toBe('Currently out of stock.');
  });

  it('reports missing SKUs', async () => {
    await expect(checkInventory({ sku: 'UNKNOWN' })).resolves.toBe("SKU 'UNKNOWN' not found in the inventory system.");
  });
});
