import { z } from 'zod';

export const secRowSchema = z.object({
  NOMBRE_REGION: z.string(),
  NOMBRE_COMUNA: z.string(),
  CLIENTES_AFECTADOS: z.number().int().nonnegative(),
});

export const secResponseSchema = z.array(secRowSchema);

export type SecRow = z.infer<typeof secRowSchema>;
