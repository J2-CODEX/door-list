"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/registration-controls";
export default function TicketRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button type="button" className="mt-5 w-full" disabled={pending} aria-busy={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Actualizando…" : "Actualizar estado"}</Button>;
}
