import { Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import pg from 'pg';
import { Subject } from 'rxjs';
import { config } from '../config.js';

/**
 * Escucha el canal LISTEN/NOTIFY de PostgreSQL: el collector avisa cada vez que guarda
 * datos nuevos y recalcula incidentes. Si la conexión se cae, se reconecta sola.
 */
@Injectable()
export class UpdatesService implements OnModuleInit, OnApplicationShutdown {
  readonly updates$ = new Subject<string>();
  private client: pg.Client | null = null;
  private stopped = false;

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    if (this.stopped) return;
    const client = new pg.Client({ connectionString: config.databaseUrl, keepAlive: true });
    client.on('notification', (msg) => this.updates$.next(msg.payload ?? new Date().toISOString()));
    client.on('error', (err) => {
      console.error(`[updates] conexión LISTEN perdida: ${err.message}`);
      this.scheduleReconnect();
    });
    try {
      await client.connect();
      await client.query(`LISTEN ${config.updatesChannel}`);
      this.client = client;
    } catch (err) {
      console.error(`[updates] no se pudo conectar: ${(err as Error).message}`);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    this.client?.end().catch(() => {});
    this.client = null;
    if (!this.stopped) setTimeout(() => void this.connect(), 10_000);
  }

  async onApplicationShutdown() {
    this.stopped = true;
    this.updates$.complete();
    await this.client?.end().catch(() => {});
  }
}
