import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, Public } from '../auth/decorators';
import { CreateItemDto, ListItemsQuery, UpdateItemDto } from './dto';
import { ItemsService } from './items.service';

@Controller('items')
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Public()
  @Get()
  list(@Query() query: ListItemsQuery) {
    return this.items.list(query);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.items.get(id);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateItemDto) {
    return this.items.create(userId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.items.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.items.remove(userId, id);
  }
}
