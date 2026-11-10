"use client";

export async function syncOrganizerSession(token: string, signal?: AbortSignal): Promise<{ userId: string; email: string }> {
  const response = await fetch("/api/organizador/sesion", {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal,
  });
  if (!response.ok) throw new Error("No pudimos validar tu sesión. Vuelve a iniciar sesión.");
  return response.json();
}

export async function clearOrganizerSession() {
  const response = await fetch("/api/organizador/sesion", { method: "DELETE" });
  if (!response.ok) throw new Error("No pudimos cerrar la sesión. Inténtalo de nuevo.");
}
