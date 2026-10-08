import { Controller, Get, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { parse, regionSchema } from '../common/validation.js';
import { config } from '../config.js';
import { StatusService } from './status.service.js';

@Controller('status')
export class StatusController {
  constructor(@Inject(StatusService) private readonly status: StatusService) {}

  @Get()
  current(@Query() query: unknown) {
    const q = parse(z.object({ region: regionSchema.default(config.defaultRegion) }), query);
    return this.status.current(q.region);
  }
}
