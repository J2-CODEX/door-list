import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Ingresa tu correo electrónico.").max(254, "El correo debe tener hasta 254 caracteres.").pipe(z.email("Ingresa un correo electrónico válido.")),
  // Login accepts the existing password verbatim, without imposing signup rules.
  password: z.string().min(1, "Ingresa tu contraseña."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export function loginErrorMessage(status?: number) {
  if (status === 429) return "Has realizado varios intentos. Espera unos minutos antes de volver a intentar.";
  if (!status || status >= 500) return "No pudimos conectar con el servicio. Comprueba tu conexión y vuelve a intentarlo.";
  return "El correo o la contraseña no son correctos. Revisa tus datos e inténtalo de nuevo.";
}
