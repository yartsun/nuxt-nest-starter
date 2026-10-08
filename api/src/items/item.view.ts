import type { Item } from '@prisma/client';

export interface ItemView {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  tags: string[];
  inStock: boolean;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Money is stored as integer cents and exposed as a decimal number. */
export function toItemView(item: Item): ItemView {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    price: item.priceCents / 100,
    tags: item.tags,
    inStock: item.inStock,
    ownerId: item.ownerId,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export const toCents = (price: number) => Math.round(price * 100);
