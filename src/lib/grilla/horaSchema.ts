import { z } from "zod";
import { normalizarHoraHHMM } from "@/lib/grilla/tiempo";

export const horaInicioGrillaZ = z
  .string()
  .regex(/^\d{1,2}:\d{2}(:\d{2})?$/, "Formato HH:MM")
  .transform((raw, ctx) => {
    const normalizada = normalizarHoraHHMM(raw);
    if (!normalizada) {
      ctx.addIssue({ code: "custom", message: "Hora inválida" });
      return z.NEVER;
    }
    return normalizada;
  });
