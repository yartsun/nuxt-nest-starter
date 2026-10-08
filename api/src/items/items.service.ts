import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { SearchSync } from '../search/search-sync.service';
import type { CreateItemDto, ListItemsQuery, UpdateItemDto } from './dto';
import { toCents, toItemView, type ItemView } from './item.view';

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchSync,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Keyset pagination: stable under concurrent inserts, unlike offsets. */
  async list(query: ListItemsQuery): Promise<{ items: ItemView[]; nextCursor: string | null }> {
    const rows = await this.prisma.item.findMany({
      where: query.category ? { category: query.category } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, query.limit);
    return { items: page.map(toItemView), nextCursor: rows.length > query.limit ? page[page.length - 1].id : null };
  }

  async get(id: string): Promise<ItemView> {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    return toItemView(item);
  }

  async create(ownerId: string, dto: CreateItemDto): Promise<ItemView> {
    const item = await this.prisma.item.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        category: dto.category,
        priceCents: toCents(dto.price),
        tags: dto.tags ?? [],
        inStock: dto.inStock ?? true,
        ownerId,
      },
    });
    const view = toItemView(item);
    await this.search.upsert([item.id]);
    this.realtime.toCatalog('item.created', view);
    return view;
  }

  async update(userId: string, id: string, dto: UpdateItemDto): Promise<ItemView> {
    await this.ownedItem(userId, id);
    const item = await this.prisma.item.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        priceCents: dto.price === undefined ? undefined : toCents(dto.price),
        tags: dto.tags,
        inStock: dto.inStock,
      },
    });
    const view = toItemView(item);
    await this.search.upsert([id]);
    this.realtime.toCatalog('item.updated', view);
    return view;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.ownedItem(userId, id);
    await this.prisma.item.delete({ where: { id } });
    await this.search.remove([id]);
    this.realtime.toCatalog('item.deleted', { id });
  }

  private async ownedItem(userId: string, id: string) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    if (item.ownerId !== userId) throw new ForbiddenException('Only the owner can change this item');
    return item;
  }
}
