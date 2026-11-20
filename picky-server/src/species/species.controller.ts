import { Controller, Get, Header } from '@nestjs/common';
import { SpeciesService } from './species.service';

@Controller('species')
export class SpeciesController {
  constructor(private readonly species: SpeciesService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=86400')
  list() {
    return this.species.list();
  }
}
