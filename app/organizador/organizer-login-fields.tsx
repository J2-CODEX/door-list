import { Controller, type UseFormReturn } from "react-hook-form";
import type { LoginInput } from "@/lib/login";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function OrganizerLoginFields({ form, busy, idPrefix }: { form: UseFormReturn<LoginInput>; busy: boolean; idPrefix: string }) {
  return <>
    {(["email", "password"] as const).map(name => {
      const id = `${idPrefix}-${name}`;
      return <Controller key={name} name={name} control={form.control} render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={busy}>
          <FieldLabel htmlFor={id}>{name === "email" ? "Correo" : "Contraseña"}</FieldLabel>
          <Input {...field} id={id} type={name === "email" ? "email" : "password"} autoComplete={name === "email" ? "email" : "current-password"} required disabled={busy} maxLength={name === "email" ? 254 : undefined} aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? `${id}-error` : undefined} />
          {fieldState.invalid && <FieldError id={`${id}-error`} errors={[fieldState.error]} />}
        </Field>
      )} />;
    })}
    {form.formState.errors.root?.auth?.message && <FieldError>{form.formState.errors.root.auth.message}</FieldError>}
  </>;
}
