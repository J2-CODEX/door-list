import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
//console.log({environment:process.env.NODE_ENV})
export const metadata: Metadata = {
  title: "Door List | Encuentros que conectan",
  description:
    "Descubre el próximo encuentro de Door List. Una puerta abierta a nuevas ideas y conexiones.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}<Toaster richColors position="top-right" closeButton /></body>
    </html>
  );
}
