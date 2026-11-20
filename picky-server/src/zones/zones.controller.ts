import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Response } from 'express';
import { parseBbox } from '../common/utils/bbox';
import { NearQueryDto } from './dto/near-query.dto';
import { ZonesQueryDto } from './dto/zones-query.dto';
import { SnapshotQueryDto } from './dto/snapshot-query.dto';
import { ZoneDetailQueryDto } from './dto/zone-detail-query.dto';
import { ExplanationQueryDto } from './dto/explanation-query.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { ConditionalResponse, ZonesService } from './zones.service';

@Controller('zones')
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Get()
  list(
    @Query() query: ZonesQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    return this.conditional(
      response,
      this.zones.listZones(
        parseBbox(query.bbox),
        query.species,
        query.zoom,
        response.req.header('if-none-match'),
      ),
      300,
      'application/geo+json',
    );
  }

  @Get('near')
  @Header('Cache-Control', 'private, max-age=300')
  async nearby(@Query() query: NearQueryDto): Promise<Record<string, unknown>> {
    return this.zones.nearby(
      query.lat,
      query.lng,
      query.species,
      query.radius_km,
      query.effectiveLimit,
      query.sort,
    );
  }

  @Get('snapshot')
  async snapshot(
    @Query() query: SnapshotQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    await this.conditional(
      response,
      this.zones.snapshot(
        parseBbox(query.bbox),
        query.since,
        response.req.header('if-none-match'),
      ),
      0,
      'application/geo+json',
    );
  }

  @Get(':id/explanation')
  @Header('Cache-Control', 'private, max-age=300')
  explanation(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 422 }))
    zoneId: string,
    @Query() query: ExplanationQueryDto,
  ): Promise<Record<string, unknown>> {
    return this.zones.explanation(zoneId, query.species, query.lang);
  }

  @Get(':id/history')
  @Header('Cache-Control', 'private, max-age=3600')
  history(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 422 }))
    zoneId: string,
    @Query() query: HistoryQueryDto,
  ): Promise<Record<string, unknown>> {
    return this.zones.history(zoneId, query.species, query.days);
  }

  @Get(':id')
  async detail(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 422 }))
    zoneId: string,
    @Query() query: ZoneDetailQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    if ((query.lat === undefined) !== (query.lng === undefined)) {
      throw new UnprocessableEntityException(
        'lat and lng must be provided together.',
      );
    }
    await this.conditional(
      response,
      this.zones.detail(
        zoneId,
        { lat: query.lat, lng: query.lng },
        response.req.header('if-none-match'),
      ),
      300,
    );
  }

  private async conditional(
    response: Response,
    pending: Promise<ConditionalResponse<Record<string, unknown>>>,
    maxAge: number,
    contentType = 'application/json',
  ): Promise<void> {
    const result = await pending;
    response.setHeader('ETag', result.etag);
    if (maxAge > 0)
      response.setHeader('Cache-Control', `private, max-age=${maxAge}`);
    if (result.not_modified) {
      response.status(304).end();
      return;
    }
    response.type(contentType).status(200).json(result.body);
  }
}
