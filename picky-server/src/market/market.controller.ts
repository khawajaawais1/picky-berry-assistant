import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthUser } from '../auth/auth-user.interface';
import {
  CreateListingDto,
  CreateOrderDto,
  ListingsQueryDto,
  SendMessageDto,
  ThreadQueryDto,
} from './dto/market.dto';
import { MarketService } from './market.service';

type AuthenticatedRequest = Request & { user: AuthUser };
const uuid = new ParseUUIDPipe({ errorHttpStatusCode: 422 });

/** Feature E1: the surplus marketplace (listings, buyer–seller threads, orders). */
@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get('listings')
  listings(@Query() query: ListingsQueryDto): Promise<Record<string, unknown>> {
    return this.market.listings(query);
  }

  @Post('listings')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  create(
    @Body() input: CreateListingDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.market.createListing(request.user.id, input);
  }

  @Get('listings/:id')
  listing(@Param('id', uuid) id: string): Promise<Record<string, unknown>> {
    return this.market.listing(id);
  }

  @Get('listings/:id/messages')
  thread(
    @Param('id', uuid) id: string,
    @Query() query: ThreadQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.market.thread(request.user.id, id, query.buyer_id);
  }

  @Post('listings/:id/messages')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  send(
    @Param('id', uuid) id: string,
    @Body() input: SendMessageDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.market.send(request.user.id, id, input.body, input.buyer_id);
  }

  @Post('orders')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  order(
    @Body() input: CreateOrderDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.market.createOrder(request.user.id, input);
  }

  @Get('orders')
  orders(
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.market.orders(request.user.id);
  }

  @Get('orders/:id')
  getOrder(
    @Param('id', uuid) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.market.order(request.user.id, id);
  }
}
