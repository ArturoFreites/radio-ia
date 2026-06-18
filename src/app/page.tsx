import Link from "next/link";
import { AironLogo } from "@/components/brand/AironLogo";

export default function Home(): React.ReactElement {
  return (
    <main
      className="relative grid min-h-screen place-items-center p-6"
      style={{
        background: `radial-gradient(700px circle at 50% 35%, var(--primary-glow), transparent 65%), var(--background)`,
      }}
    >
      <div className="w-full max-w-md rounded-[var(--r-xl)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mb-6 flex justify-center">
          <AironLogo priority size="xl" />
        </div>
        <p className="text-[color:var(--muted)]">
          Plataforma multi-tenant para crear, generar y emitir programas de radio con IA.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            className="rounded-[var(--r-md)] bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:brightness-95"
            href="/login"
          >
            Iniciar sesión
          </Link>
          <Link
            className="rounded-[var(--r-md)] border border-[color:var(--border)] px-5 py-2.5 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--surface-soft)]"
            href="/register"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </main>
  );
}
