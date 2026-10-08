import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.factory.js';

/**
 * Tests e2e contra la base de datos configurada en .env (solo lectura).
 * Requieren Docker con la BD levantada y los seeds de comunas cargados.
 */
let app: INestApplication;
let http: ReturnType<typeof request>;

beforeAll(async () => {
  app = await createApp();
  await app.init();
  http = request(app.getHttpServer());
});

afterAll(async () => {
  await app.close();
});

describe('GET /api/health', () => {
  it('responde con el estado de la BD y la frescura de los datos', async () => {
    const res = await http.get('/api/health').expect(200);
    expect(res.body.database).toBe('up');
    expect(['ok', 'degraded']).toContain(res.body.status);
    expect(typeof res.body.stale).toBe('boolean');
  });
});

describe('GET /api/comunas', () => {
  it('entrega las 52 comunas de la RM como GeoJSON', async () => {
    const res = await http.get('/api/comunas').expect(200);
    expect(res.body.type).toBe('FeatureCollection');
    expect(res.body.features).toHaveLength(52);
    expect(res.body.features[0].properties).toHaveProperty('cut');
    expect(['Polygon', 'MultiPolygon']).toContain(res.body.features[0].geometry.type);
    expect(res.headers['cache-control']).toContain('max-age');
  });

  it('rechaza una región inválida', async () => {
    await http.get('/api/comunas?region=RM').expect(400);
  });
});

describe('GET /api/status', () => {
  it('entrega el estado actual de todas las comunas de la RM', async () => {
    const res = await http.get('/api/status').expect(200);
    expect(res.body.comunas).toHaveLength(52);
    const total = res.body.comunas.reduce((s: number, c: { clientes: number }) => s + c.clientes, 0);
    expect(res.body.totalClientes).toBe(total);
  });
});

describe('GET /api/incidents', () => {
  it('lista incidentes paginados y ordenados por impacto', async () => {
    const res = await http.get('/api/incidents?sort=impact&limit=5').expect(200);
    expect(res.body.items.length).toBeLessThanOrEqual(5);
    const ch = res.body.items.map((i: { clienteHoras: number }) => i.clienteHoras);
    expect(ch).toEqual([...ch].sort((a, b) => b - a));
  });

  it('solo abiertos con status=open', async () => {
    const res = await http.get('/api/incidents?status=open').expect(200);
    for (const i of res.body.items) expect(i.endedAt).toBeNull();
  });

  it('valida los parámetros', async () => {
    await http.get('/api/incidents?limit=abc').expect(400);
    await http.get('/api/incidents?cut=123').expect(400);
  });

  it('detalle con línea de tiempo, y 404 si no existe', async () => {
    const list = await http.get('/api/incidents?limit=1').expect(200);
    if (list.body.items.length > 0) {
      const res = await http.get(`/api/incidents/${list.body.items[0].id}`).expect(200);
      expect(res.body.timeline.length).toBeGreaterThan(0);
      expect(res.body.timeline[0]).toHaveProperty('clientes');
    }
    await http.get('/api/incidents/999999999').expect(404);
  });
});

describe('estadísticas', () => {
  it('estadísticas de una comuna (Maipú)', async () => {
    const res = await http.get('/api/comunas/13119/stats?days=365').expect(200);
    expect(res.body.comuna.nombre).toBe('Maipú');
    expect(res.body).toHaveProperty('porMes');
    expect(res.body).toHaveProperty('porHoraDelDia');
  });

  it('ranking de comunas de la RM', async () => {
    const res = await http.get('/api/stats/comunas?days=365').expect(200);
    expect(res.body.comunas).toHaveLength(52);
  });
});
