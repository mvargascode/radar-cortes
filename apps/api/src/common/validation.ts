import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/** Valida query/params con zod y responde 400 con el detalle si no calzan. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) {
    throw new BadRequestException({
      message: 'Parámetros inválidos',
      issues: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return r.data;
}

export const regionSchema = z.string().regex(/^\d{2}$/, 'región: código de 2 dígitos (ej. 13)');
export const cutSchema = z.string().regex(/^\d{5}$/, 'comuna: código CUT de 5 dígitos (ej. 13119)');
