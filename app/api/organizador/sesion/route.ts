import { cookies } from "next/headers";
import { authenticateOrganizer } from "@/lib/supabase/organizer";
import { organizerCookieName } from "@/lib/supabase/dashboard-session";

const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export async function POST(request: Request) {
  try {
    const auth = await authenticateOrganizer(request);
    if (!auth) return Response.json({ error: "Inicia sesión con tu correo y contraseña." }, { status: 401 });
    const token = request.headers.get("authorization")!.replace(/^Bearer /i, "");
    (await cookies()).set(organizerCookieName, token, { ...cookieOptions, maxAge: 3600 });
    return Response.json({ userId: auth.userId, email: auth.email }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "No pudimos validar tu sesión. Inténtalo de nuevo." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  }
  (await cookies()).set(organizerCookieName, "", { ...cookieOptions, maxAge: 0 });
  return new Response(null, { status: 204 });
}
