import { Module } from '@nestjs/common';
import { ComunasController } from './comunas/comunas.controller.js';
import { ComunasService } from './comunas/comunas.service.js';
import { DbModule } from './db/db.module.js';
import { HealthController } from './health/health.controller.js';
import { IncidentsController } from './incidents/incidents.controller.js';
import { IncidentsService } from './incidents/incidents.service.js';
import { StatsController } from './stats/stats.controller.js';
import { StatusController } from './status/status.controller.js';
import { StatusService } from './status/status.service.js';
import { StreamController } from './stream/stream.controller.js';
import { UpdatesService } from './stream/updates.service.js';

@Module({
  imports: [DbModule],
  controllers: [
    HealthController,
    ComunasController,
    StatusController,
    IncidentsController,
    StatsController,
    StreamController,
  ],
  providers: [ComunasService, StatusService, IncidentsService, UpdatesService],
})
export class AppModule {}
