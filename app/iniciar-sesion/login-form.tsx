"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";
import { syncOrganizerSession } from "@/lib/supabase/browser-session";
import { loginSchema, loginErrorMessage, type LoginInput } from "@/lib/login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginAlert, LoginAlertTitle, LoginAlertDescription } from "./login-alert";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });
  const { isSubmitting, errors } = form.formState;
  const busy = isSubmitting || redirecting;
  const authError = errors.root?.auth?.message;
  useEffect(() => { if (authError) alertRef.current?.focus(); }, [authError]);

  async function login(values: LoginInput) {
    if (!browserClient || busy) return;
    form.clearErrors("root");
    try {
      const { data, error } = await browserClient.auth.signInWithPassword(values);
      if (error || !data.session) {
        form.setError("root.auth", { message: loginErrorMessage(error?.status) });
        return;
      }
      try { await syncOrganizerSession(data.session.access_token); }
      catch {
        form.setError("root.auth", { message: "No pudimos abrir tu sesión. Vuelve a intentarlo en unos momentos." });
        return;
      }
      form.resetField("password");
      setRedirecting(true);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      form.setError("root.auth", { message: loginErrorMessage() });
    }
  }

  return <Card aria-labelledby="login-title" className="shadow-lg shadow-foreground/5">
    <CardHeader>
      <CardTitle id="login-title" className="text-2xl">Bienvenido de vuelta</CardTitle>
      <CardDescription id="login-description">Usa el correo y la contraseña de tu cuenta de organizador. Todos los campos son obligatorios.</CardDescription>
    </CardHeader>
    <CardContent>
      {!browserClient ? <LoginAlert><LoginAlertTitle>Acceso temporalmente no disponible</LoginAlertTitle><LoginAlertDescription>Vuelve a intentarlo en unos momentos.</LoginAlertDescription></LoginAlert> :
        <form noValidate onSubmit={form.handleSubmit(login)} aria-describedby="login-description" aria-busy={busy} className="space-y-6" onChangeCapture={() => { if (authError) form.clearErrors("root"); }}>
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            <legend className="sr-only">Credenciales de acceso</legend>
            <Controller name="email" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} data-disabled={busy}>
                <FieldLabel htmlFor="login-email">Correo electrónico</FieldLabel>
                <Input {...field} id="login-email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="tu@correo.com" aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "login-email-help login-email-error" : "login-email-help"} />
                <FieldDescription id="login-email-help">El correo con el que tienes tu cuenta de organizador.</FieldDescription>
                {fieldState.invalid && <FieldError id="login-email-error" errors={[fieldState.error]} />}
              </Field>
            )} />
            <Controller name="password" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} data-disabled={busy}>
                <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
                <div className="relative">
                  <Input {...field} id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required className="pr-24" aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "login-password-error" : undefined} />
                  <button type="button" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} aria-controls="login-password" className="absolute inset-y-1 right-1 cursor-pointer rounded-lg px-3 text-xs font-medium text-foreground/70 outline-none hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-[#719148] disabled:opacity-50">{showPassword ? "Ocultar" : "Mostrar"}</button>
                </div>
                {fieldState.invalid && <FieldError id="login-password-error" errors={[fieldState.error]} />}
              </Field>
            )} />
          </fieldset>
          {authError && <LoginAlert ref={alertRef} tabIndex={-1}><LoginAlertTitle>No pudimos iniciar sesión</LoginAlertTitle><LoginAlertDescription>{authError}</LoginAlertDescription></LoginAlert>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy && <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 animate-spin motion-reduce:animate-none" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity=".25" /><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
            {redirecting ? "Abriendo tu panel…" : isSubmitting ? "Iniciando sesión…" : "Entrar a mi panel"}
            {!busy && <span aria-hidden="true">→</span>}
          </Button>
          <span role="status" className="sr-only">{redirecting ? "Sesión iniciada. Abriendo tu panel." : isSubmitting ? "Validando tus credenciales." : ""}</span>
          <p className="text-center text-xs leading-relaxed text-foreground/55">Solo tú puedes ver los registros de tus eventos.</p>
        </form>}
    </CardContent>
  </Card>;
}
