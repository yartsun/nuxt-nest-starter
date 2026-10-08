import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/decorators';
import { SearchQuery } from './search-query';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Public()
  @Get()
  find(@Query() query: SearchQuery) {
    return this.search.search(query);
  }
}
