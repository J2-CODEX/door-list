import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { exampleEvent } from "./fixtures";

type EventFormExampleProps = {
  state: "default" | "invalid" | "pending" | "success";
  previewAction: string;
};

export function EventFormExample({ state, previewAction }: EventFormExampleProps) {
  const invalid = state === "invalid";
  const pending = state === "pending";

  return (
    <section aria-labelledby="event-form-heading" className="w-full max-w-2xl">
      <Card>
        <CardHeader>
          <h2 id="event-form-heading" className="text-2xl font-semibold tracking-tight">Datos del evento</h2>
          <p className="text-sm leading-5 text-foreground/60">Revisa cómo se presentará tu próximo encuentro.</p>
        </CardHeader>
        <CardContent>
          <form action={previewAction} method="get" className="space-y-6" aria-busy={pending}>
            <div className="grid gap-4">
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor="example-event-title">Nombre del evento</FieldLabel>
                <Input id="example-event-title" name="title" defaultValue={exampleEvent.title} required disabled={pending} aria-invalid={invalid} aria-describedby={invalid ? "example-title-help example-title-error" : "example-title-help"} />
                <FieldDescription id="example-title-help">Usa un nombre que ayude a reconocer el encuentro.</FieldDescription>
                {invalid && <FieldError id="example-title-error">Revisa el nombre del evento antes de continuar.</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="example-event-venue">Lugar</FieldLabel>
                <Input id="example-event-venue" name="venue" defaultValue={exampleEvent.venue} required disabled={pending} />
              </Field>
            </div>
            <p role="status" className={pending || state === "success" ? "text-sm text-foreground/60" : "sr-only"}>
              {pending ? "Preparando vista previa…" : state === "success" ? "Vista previa preparada." : ""}
            </p>
            <Button type="submit" disabled={pending}>{pending ? "Preparando…" : "Ver vista previa"}</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
