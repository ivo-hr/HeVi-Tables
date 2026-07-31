import { z } from "zod";

import { POINT_SYSTEMS } from "@/lib/types";

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio.`)
    .max(max, `${label} no puede superar ${max} caracteres.`);

export const tableSchema = z.object({
  name: requiredText("El nombre", 80),
  pointSystem: z.enum(POINT_SYSTEMS, {
    error: "Elige un sistema de puntos válido."
  }),
  maxPoint: z.coerce
    .number()
    .int("Los puntos máximos deben ser un número entero.")
    .min(1, "Los puntos máximos deben ser al menos 1.")
    .max(100_000, "Los puntos máximos no pueden superar 100.000.")
});

export const rowBaseSchema = z.object({
  userIds: z
    .array(z.uuid("Participante no válido."))
    .min(1, "Selecciona al menos un participante."),
  notes: z.string().trim().max(500, "Las notas no pueden superar 500 caracteres.")
});

export const profileSchema = z.object({
  username: requiredText("El nombre", 30).regex(
    /^[\p{L}\p{N}_. -]+$/u,
    "Usa letras, números, espacios, puntos, guiones o guiones bajos."
  )
});

export const credentialsSchema = z.object({
  email: z.email("Escribe un email válido.").max(254),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(128)
});

export function flattenZodErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors;
}
