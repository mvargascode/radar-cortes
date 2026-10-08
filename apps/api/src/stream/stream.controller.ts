import { Controller, Inject, type MessageEvent, Sse } from '@nestjs/common';
import { interval, map, merge, type Observable } from 'rxjs';
import { UpdatesService } from './updates.service.js';

@Controller('stream')
export class StreamController {
  constructor(@Inject(UpdatesService) private readonly updates: UpdatesService) {}

  /**
   * Server-Sent Events: emite `update` cuando el collector guarda datos nuevos
   * (el frontend vuelve a pedir /api/status) y `ping` cada 25 s para mantener viva la conexión.
   */
  @Sse()
  stream(): Observable<MessageEvent> {
    return merge(
      this.updates.updates$.pipe(map((at) => ({ type: 'update', data: { at } }))),
      interval(25_000).pipe(map(() => ({ type: 'ping', data: { at: new Date().toISOString() } }))),
    );
  }
}
