"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AironLogo } from "@/components/brand/AironLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function RegisterPage(): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombreRadio: "",
    nombreAdmin: "",
    email: "",
    password: "",
    ciudad: "",
    provincia: "",
  });

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);

    if (!response.ok) {
      toast.error("No se pudo crear la cuenta");
      return;
    }
    toast.success("Cuenta creada, inicia sesion.");
    router.push("/login");
  };

  return (
    <main
      className="relative grid min-h-screen place-items-center p-6"
      style={{
        background: `radial-gradient(700px circle at 50% 35%, var(--primary-glow), transparent 65%), var(--background)`,
      }}
    >
      <section className="w-full max-w-xl rounded-[var(--r-xl)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-6 shadow-[var(--shadow-card)]">
        <div className="mb-5 flex flex-col items-center">
          <AironLogo className="mb-2" priority size="lg" />
          <p className="text-center text-xs text-[color:var(--muted)]">Radio con inteligencia artificial</p>
        </div>

        <h1 className="mb-4 text-center text-lg font-semibold text-[color:var(--text)]">Registro de radio</h1>

        <form className="space-y-3" onSubmit={onSubmit}>
          <Input
            placeholder="Nombre de la radio"
            onChange={(e) => setForm((p) => ({ ...p, nombreRadio: e.target.value }))}
          />
          <Input
            placeholder="Nombre administrador"
            onChange={(e) => setForm((p) => ({ ...p, nombreAdmin: e.target.value }))}
          />
          <Input placeholder="Ciudad" onChange={(e) => setForm((p) => ({ ...p, ciudad: e.target.value }))} />
          <Input
            placeholder="Provincia"
            onChange={(e) => setForm((p) => ({ ...p, provincia: e.target.value }))}
          />
          <Input placeholder="Email admin" onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <Input
            placeholder="Password"
            type="password"
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          />
          <Button className="w-full" disabled={loading} type="submit" variant="primary">
            {loading ? "Creando..." : "Crear cuenta"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-[color:var(--muted)]">
          ¿Ya tenés cuenta?{" "}
          <Link className="font-medium text-[color:var(--primary)] hover:brightness-110" href="/login">
            Iniciar sesión
          </Link>
        </p>
      </section>
    </main>
  );
}
