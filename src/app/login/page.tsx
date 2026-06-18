"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AironLogo } from "@/components/brand/AironLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

const REMEMBER_KEY = "airon_remember_email";

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);

    if (remember) {
      localStorage.setItem(REMEMBER_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    const response = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (!response?.ok) {
      toast.error("Credenciales invalidas");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <main
      className="relative grid min-h-screen place-items-center p-6"
      style={{
        background: `radial-gradient(700px circle at 50% 35%, var(--primary-glow), transparent 65%), var(--background)`,
      }}
    >
      <section className="w-full max-w-sm rounded-[var(--r-xl)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-6 shadow-[var(--shadow-card)]">
        <div className="mb-5 flex flex-col items-center">
          <AironLogo className="mb-2" priority size="lg" />
          <p className="text-center text-xs text-[color:var(--muted)]">Radio con inteligencia artificial</p>
        </div>

        <h1 className="mb-4 text-center text-lg font-semibold text-[color:var(--text)]">Bienvenido de vuelta</h1>

        <form className="space-y-3" onSubmit={onSubmit}>
          <Input
            label="Email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            type="email"
            value={email}
          />
          <PasswordInput
            label="Contraseña"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            value={password}
          />

          <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--muted)]">
            <input
              checked={remember}
              className="h-4 w-4 rounded border-[color:var(--border)] bg-[color:var(--surface)] accent-[color:var(--primary)]"
              type="checkbox"
              onChange={(e) => setRemember(e.target.checked)}
            />
            Recordarme
          </label>

          <Button className="w-full" disabled={loading} type="submit" variant="primary">
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <hr className="flex-1 border-[color:var(--border-subtle)]" />
          <span className="text-xs text-[color:var(--muted)]">o continuar con</span>
          <hr className="flex-1 border-[color:var(--border-subtle)]" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button className="w-full" disabled title="Próximamente" type="button" variant="secondary">
            Google
          </Button>
          <Button className="w-full" disabled title="Próximamente" type="button" variant="secondary">
            Apple
          </Button>
        </div>

        <p className="mt-5 text-center text-sm text-[color:var(--muted)]">
          ¿No tenés cuenta?{" "}
          <Link className="font-medium text-[color:var(--primary)] hover:brightness-110" href="/register">
            Regístrate
          </Link>
        </p>
      </section>
    </main>
  );
}
