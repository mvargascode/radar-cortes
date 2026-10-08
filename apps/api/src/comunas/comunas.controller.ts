import { Controller, Get, Header, Inject, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { cutSchema, parse, regionSchema } from '../common/validation.js';
import { config } from '../config.js';
import { ComunasService } from './comunas.service.js';

@Controller('comunas')
export class ComunasController {
  constructor(@Inject(ComunasService) private readonly comunas: ComunasService) {}

  /** GeoJSON de las comunas de una región (por defecto, la RM). Cacheable un día. */
  @Get()
  @Header('Cache-Control', 'public, max-age=86400')
  geojson(@Query() query: unknown) {
    const q = parse(z.object({ region: regionSchema.default(config.defaultRegion) }), query);
    return this.comunas.geojson(q.region);
  }

  /** Estadísticas de una comuna: incidentes, duración, peores cortes, por mes y por hora. */
  @Get(':cut/stats')
  stats(@Param('cut') cut: string, @Query() query: unknown) {
    const q = parse(z.object({ days: z.coerce.number().int().min(1).max(1100).default(365) }), query);
    return this.comunas.stats(parse(cutSchema, cut), q.days);
  }
}
