"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SpotifyIcon } from "@/components/brand/SpotifyIcon";

type SpotifyOAuthPanelProps = {
  conectado: boolean;
  alerta?: string | null;
  exito?: boolean;
};

export function SpotifyOAuthPanel({
  conectado,
  alerta,
  exito,
}: SpotifyOAuthPanelProps): React.ReactElement {
  const router = useRouter();
  const [desconectando, setDesconectando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function desconectar(): Promise<void> {
    setError(null);
    setDesconectando(true);
    try {
      const res = await fetch("/api/spotify/conexion", { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(typeof j.error === "string" ? j.error : "No se pudo desconectar");
        return;
      }
      router.refresh();
    } finally {
      setDesconectando(false);
    }
  }

  return (
    <div className="max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
      <div className="flex items-center gap-3">
        <SpotifyIcon size="lg" />
        <h2 className="text-xl font-semibold text-white">Conexión OAuth</h2>
      </div>
      <p className="mt-3 text-zinc-400">
        Vinculá la cuenta de Spotify de la radio. Los slots DJ de la grilla usan esta conexión en la página de aire.
      </p>
      <p className="mt-1 text-sm text-zinc-500">Se requiere Spotify Premium para reproducir en el navegador.</p>

      <p className="mt-6 text-sm text-zinc-300">
        Estado:{" "}
        <span className={conectado ? "font-medium text-emerald-400" : "font-medium text-zinc-500"}>
          {conectado ? "Conectado" : "No conectado"}
        </span>
      </p>

      {alerta ? <p className="mt-4 text-sm text-amber-400">{alerta}</p> : null}
      {exito ? <p className="mt-4 text-sm text-emerald-400">Cuenta vinculada correctamente.</p> : null}
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {conectado ?
          <button
            type="button"
            disabled={desconectando}
            onClick={() => void desconectar()}
            className="rounded-lg border border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            {desconectando ? "Desconectando…" : "Desconectar"}
          </button>
        : <a
            href="/api/spotify/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1DB954] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1ed760]"
          >
            <SpotifyIcon branded={false} className="text-white" size="sm" />
            Conectar cuenta Spotify
          </a>
        }
      </div>
    </div>
  );
}
