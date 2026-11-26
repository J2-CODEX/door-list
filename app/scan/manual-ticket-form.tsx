"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { manualCheckInSchema, type ManualCheckInInput } from "@/lib/check-in";
import { Field, FieldError, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ManualTicketForm({ onValidate }: { onValidate: (ticketCode: string) => Promise<void> }) {
  const form = useForm<ManualCheckInInput>({
    resolver: zodResolver(manualCheckInSchema), defaultValues: { ticketCode: "" },
    mode: "onTouched", reValidateMode: "onChange",
  });
  return <form id="manual-check-in" noValidate onSubmit={form.handleSubmit(values => onValidate(values.ticketCode))} aria-busy={form.formState.isSubmitting} className="scan-manual">
    <h2 className="text-2xl font-semibold tracking-tight">Ingresar código</h2>
    <p>Copia el código completo que aparece debajo del QR.</p>
    <Controller name="ticketCode" control={form.control} render={({ field, fieldState }) => (
      <Field data-invalid={fieldState.invalid}>
        <FieldLabel htmlFor="ticket-code">Código de la entrada</FieldLabel>
        <Input {...field} id="ticket-code" autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={256} disabled={form.formState.isSubmitting} aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "manual-help manual-code-error" : "manual-help"} />
        <FieldDescription id="manual-help">Validar registra el ingreso de inmediato.</FieldDescription>
        {fieldState.invalid && <FieldError id="manual-code-error" errors={[fieldState.error]} />}
      </Field>
    )} />
  </form>;
}
