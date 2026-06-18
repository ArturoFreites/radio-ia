"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";

type ApiVoz = {
  nombre: string;
  geminiVoiceId: string;
  genero: string;
  tono: string;
};

type ApiItem = {
  vozId?: string;
  voz?: ApiVoz;
};

export type Props = {
  label: string;
  value: string | null;
  onChange: (elevenLabsVoiceId: string) => void;
  disabled?: boolean;
};

export function VozSelectorLocal({ label, value, onChange, disabled }: Props): React.ReactElement {
  const [items, setItems] = useState<Array<{ vozId: string; voz: ApiVoz }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const res = await fetch("/api/voces", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const raw = (await res.json()) as ApiItem[];
        const mapped = raw
          .filter((row): row is ApiItem & { vozId: string; voz: ApiVoz } => Boolean(row.voz && row.vozId))
          .map((row) => ({ vozId: row.vozId, voz: row.voz }));
        if (!cancelled) setItems(mapped);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Select label={label} value="" disabled>
        <option value="">Cargando voces…</option>
      </Select>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-amber-900/50 bg-amber-950/30 text-xs text-amber-200">
        <p className="mb-1 font-medium">{label}</p>
        <p className="text-amber-100/90">No hay voces configuradas.</p>
        <Link href="/voces" className="mt-1 inline-block text-amber-300 underline hover:text-amber-200">
          Ir a Voces para agregar
        </Link>
      </Card>
    );
  }

  const selected = value != null && value !== "" ? items.find((i) => i.voz.geminiVoiceId === value) : undefined;

  return (
    <Select
      label={label}
      value={selected ? value! : ""}
      onChange={(e) => {
        const v = e.target.value;
        if (v) onChange(v);
      }}
      disabled={disabled}
    >
      <option value="">Elegir voz…</option>
      {items.map((row) => (
        <option key={row.vozId} value={row.voz.geminiVoiceId}>
          {row.voz.nombre}
        </option>
      ))}
    </Select>
  );
}
