import { FunctionDeclaration } from '@google/generative-ai';

export interface InventoryCheckArgs {
  sku: string;
}

// Strict TypeScript interface mapped to Gemini Tool Declaration
export const inventoryToolDeclaration: FunctionDeclaration = {
  name: 'check_inventory',
  description: 'Checks the live inventory status for a specific product SKU.',
  parameters: {
    type: "OBJECT",
    properties: {
      sku: {
        type: "STRING",
        description: 'The exact SKU of the product to check (e.g., "SHOE-123").',
      },
    },
    required: ['sku'],
  },
};

// Tool Execution Logic
export async function executeInventoryCheck(args: InventoryCheckArgs): Promise<string> {
  console.log(`[Tool] Executing check_inventory for SKU: ${args.sku}`);
  
  // Simulated live data fetching
  const mockDb: Record<string, number> = {
    'SHOE-123': 42,
    'SHIRT-456': 0,
    'HAT-789': 5,
  };
  
  const stock = mockDb[args.sku];
  if (stock !== undefined) {
    return stock > 0 ? `In stock: ${stock} items available.` : 'Out of stock.';
  }
  return 'SKU not found in inventory system.';
}
