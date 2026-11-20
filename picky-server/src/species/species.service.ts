import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { DbService } from '../db/db.service';

export interface SpeciesDto {
  code: string;
  name_fi: string;
  name_en: string;
  latin: string | null;
  colour: string;
  season_start_doy: number | null;
  season_end_doy: number | null;
}

@Injectable()
export class SpeciesService {
  private cachedUntil = 0;
  private cachedSpecies: SpeciesDto[] | undefined;

  constructor(private readonly database: DbService) {}

  async list(): Promise<{ species: SpeciesDto[] }> {
    return { species: await this.getSpecies() };
  }

  async validate(code: string): Promise<void> {
    const species = await this.getSpecies();
    if (!species.some((item) => item.code === code)) {
      throw new UnprocessableEntityException(`Unknown species code: ${code}`);
    }
  }

  private async getSpecies(): Promise<SpeciesDto[]> {
    if (this.cachedSpecies && Date.now() < this.cachedUntil)
      return this.cachedSpecies;
    const rows = await this.database.query
      .selectFrom('species')
      .select([
        'code',
        'name_fi',
        'name_en',
        'latin',
        'colour',
        'season_start_doy',
        'season_end_doy',
      ])
      .orderBy('code')
      .execute();
    this.cachedSpecies = rows.map((row) => ({
      ...row,
      season_start_doy:
        row.season_start_doy === null ? null : Number(row.season_start_doy),
      season_end_doy:
        row.season_end_doy === null ? null : Number(row.season_end_doy),
    }));
    this.cachedUntil = Date.now() + 60 * 60 * 1000;
    return this.cachedSpecies;
  }
}
