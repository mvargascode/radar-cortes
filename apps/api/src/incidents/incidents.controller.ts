import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { cutSchema, parse, regionSchema } from '../common/validation.js';
import { config } from '../config.js';
import { IncidentsService } from './incidents.service.js';

const listSchema = z.object({
  status: z.enum(['open', 'restored', 'all']).default('all'),
  region: regionSchema.default(config.defaultRegion),
  cut: cutSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.enum(['recent', 'impact']).default('recent'),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

@Controller('incidents')
export class IncidentsController {
  constructor(@Inject(IncidentsService) private readonly incidents: IncidentsService) {}

  /** Lista de incidentes con filtros (estado, comuna, rango de fechas) y orden por fecha o impacto. */
  @Get()
  list(@Query() query: unknown) {
    return this.incidents.list(parse(listSchema, query));
  }

  /** Detalle de un incidente con su línea de tiempo hora a hora. */
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.incidents.detail(parse(z.coerce.number().int().positive(), id));
  }
}
