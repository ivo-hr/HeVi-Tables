import { z } from "zod";

import {
  ENTRY_INFO_FORMATS,
  NUMBER_SORT_ORDERS,
  POINT_SYSTEMS
} from "@/lib/types";
import { groupMarkLength, normalizeGroupMark } from "@/lib/group-mark";

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio.`)
    .max(max, `${label} no puede superar ${max} caracteres.`);

export const groupMarkSchema = z
  .string()
  .transform(normalizeGroupMark)
  .refine(
    (value) => groupMarkLength(value) >= 1 && groupMarkLength(value) <= 3,
    "Usa entre uno y tres símbolos."
  )
  .refine((value) => !/\s/u.test(value), "Las siglas no pueden contener espacios.")
  .refine(
    (value) => Array.from(value).length <= 24,
    "Ese emoji es demasiado complejo para usarlo como sigla."
  );

export const groupSchema = z.object({
  name: requiredText("El nombre", 80),
  mark: groupMarkSchema
});

export const inviteCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, "").toUpperCase())
  .pipe(
    z
      .string()
      .length(10, "El código debe tener 10 caracteres.")
      .regex(/^[A-F0-9]+$/, "El código solo contiene letras de A a F y números.")
  );

export const optionalDateSchema = z
  .union([z.literal(""), z.iso.date("La fecha no es válida.")])
  .transform((value) => value || null);

export const tableDescriptionSchema = z
  .string()
  .trim()
  .max(280, "La descripción no puede superar 280 caracteres.")
  .transform((value) => value || null);

export const tableSchema = z.object({
  name: requiredText("El nombre", 80),
  pointSystem: z.enum(POINT_SYSTEMS, {
    error: "Elige un sistema de puntos válido."
  }),
  infoFormat: z.enum(ENTRY_INFO_FORMATS, {
    error: "Elige un formato de información válido."
  }),
  numberSortOrder: z.enum(NUMBER_SORT_ORDERS, {
    error: "Elige un orden numérico válido."
  }),
  maxPoint: z.coerce
    .number()
    .int("Los puntos máximos deben ser un número entero.")
    .min(1, "Los puntos máximos deben ser al menos 1.")
    .max(100_000, "Los puntos máximos no pueden superar 100.000."),
  scheduledCloseDate: optionalDateSchema,
  description: tableDescriptionSchema
});

export const tableSettingsSchema = z.object({
  scheduledCloseDate: optionalDateSchema,
  description: tableDescriptionSchema,
  infoFormat: z.enum(ENTRY_INFO_FORMATS, {
    error: "Elige un formato de información válido."
  }),
  numberSortOrder: z.enum(NUMBER_SORT_ORDERS, {
    error: "Elige un orden numérico válido."
  })
});

export const appearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  accent: z.enum(["emerald", "blue", "violet", "orange", "rose"])
});

export const rowBaseSchema = z.object({
  userIds: z
    .array(z.uuid("Participante no válido."))
    .min(1, "Selecciona al menos un participante."),
  notes: z.string().trim().max(500, "El texto no puede superar 500 caracteres."),
  numericValue: z
    .union([z.literal(""), z.coerce.number().finite("Escribe un número válido.")])
    .transform((value) => (value === "" ? null : value))
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

type Translator = (spanish: string, english: string) => string;

function validationMessage(message: string, t?: Translator) {
  if (!t) return message;

  const exact: Record<string, string> = {
    "El nombre es obligatorio.": "The name is required.",
    "El nombre no puede superar 80 caracteres.": "The name cannot exceed 80 characters.",
    "El nombre no puede superar 30 caracteres.": "The name cannot exceed 30 characters.",
    "Usa entre uno y tres símbolos.": "Use between one and three symbols.",
    "Las siglas no pueden contener espacios.": "The group mark cannot contain spaces.",
    "Ese emoji es demasiado complejo para usarlo como sigla.": "That emoji is too complex to use as a group mark.",
    "El código debe tener 10 caracteres.": "The code must be 10 characters long.",
    "El código solo contiene letras de A a F y números.": "The code only contains letters A to F and numbers.",
    "La fecha no es válida.": "The date is invalid.",
    "La descripción no puede superar 280 caracteres.": "The description cannot exceed 280 characters.",
    "Elige un sistema de puntos válido.": "Choose a valid scoring system.",
    "Elige un formato de información válido.": "Choose a valid information format.",
    "Elige un orden numérico válido.": "Choose a valid numeric order.",
    "Los puntos máximos deben ser un número entero.": "Maximum points must be a whole number.",
    "Los puntos máximos deben ser al menos 1.": "Maximum points must be at least 1.",
    "Los puntos máximos no pueden superar 100.000.": "Maximum points cannot exceed 100,000.",
    "Participante no válido.": "Invalid participant.",
    "Selecciona al menos un participante.": "Select at least one participant.",
    "El texto no puede superar 500 caracteres.": "The text cannot exceed 500 characters.",
    "Escribe un número válido.": "Enter a valid number.",
    "Usa letras, números, espacios, puntos, guiones o guiones bajos.": "Use letters, numbers, spaces, dots, hyphens or underscores.",
    "Escribe un email válido.": "Enter a valid email address.",
    "La contraseña debe tener al menos 8 caracteres.": "The password must be at least 8 characters long."
  };

  return t(message, exact[message] ?? message);
}

export function flattenZodErrors(error: z.ZodError, t?: Translator) {
  const errors = z.flattenError(error).fieldErrors;
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      (messages as string[] | undefined)?.map((message) =>
        validationMessage(message, t)
      )
    ])
  );
}
