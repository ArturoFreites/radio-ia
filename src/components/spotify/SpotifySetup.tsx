"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";

type Playlist = {
  id: string;
  name: string;
  imageUrl: string | null;
  tracksTotal: number;
  canReadTracksViaApi: boolean;
};

type VozRow = {
  voz: { id: string; nombre: string; geminiVoiceId: string };
};

type SesionRow = {
  id: string;
  playlistNombre: string;
  estado: string;
  panelToken: string;
  createdAt: string;
};

type SpotifySetupProps = {
  conectado: boolean;
  sesiones: SesionRow[];
  alerta?: string | null;
  exito?: boolean;
};

type ApiErrorBody = { error?: unknown; detail?: unknown };

function mensajeErrorPlaylists(status: number, body: ApiErrorBody): string {
  if (status === 401) return "Tu sesión expiró, volvé a iniciar sesión";
  if (status === 400) return "Conectá tu cuenta de Spotify antes de continuar";
  const detail =
    typeof body.detail === "string" ?
      body.detail
    : typeof body.error === "string" ?
      body.error
    : null;
  return detail ? `No se pudieron cargar las playlists: ${detail}` : "No se pudieron cargar las playlists";
}

export function SpotifySetup({ conectado, sesiones, alerta, exito }: SpotifySetupProps): React.ReactElement {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [voces, setVoces] = useState<VozRow[]>([]);
  const [playlistId, setPlaylistId] = useState("");
  const [voz1, setVoz1] = useState("");
  const [voz2, setVoz2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelUrl, setPanelUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!conectado) return;
    void (async () => {
      const res = await fetch("/api/spotify/playlists");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
        setError(mensajeErrorPlaylists(res.status, body));
        return;
      }
      const data = (await res.json()) as Playlist[];
      setPlaylists(data);
      setPlaylistId((prev) => {
        if (prev && data.some((p) => p.id === prev && p.canReadTracksViaApi)) return prev;
        return data.find((p) => p.canReadTracksViaApi)?.id ?? "";
      });
    })();
  }, [conectado]);

  useEffect(() => {
    void (async () => {
      const v = await fetch("/api/voces");
      if (!v.ok) return;
      const data = (await v.json()) as VozRow[];
      setVoces(data);
      setVoz1((a) => a || data[0]?.voz.geminiVoiceId || "");
      setVoz2((b) => b || data[1]?.voz.geminiVoiceId || data[0]?.voz.geminiVoiceId || "");
    })();
  }, []);

  const iniciarSesion = async (): Promise<void> => {
    setError(null);
    setPanelUrl(null);
    if (!playlistId || !voz1 || !voz2) {
      setError("Elegí playlist y dos voces");
      return;
    }
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl?.canReadTracksViaApi) {
      setError(
        "Esta playlist no se puede usar en modo DJ: Spotify solo permite leer temas si sos el dueño o colaborador.",
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/spotify/sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId,
          playlistNombre: pl?.name ?? "Playlist",
          voz1Id: voz1,
          voz2Id: voz2,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: unknown; detail?: string };
        const base = typeof j.error === "string" ? j.error : "Error al crear sesión";
        const extra = typeof j.detail === "string" ? `\n${j.detail}` : "";
        setError(`${base}${extra}`);
        return;
      }
      const data = (await res.json()) as { panelUrl: string };
      setPanelUrl(data.panelUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const base = typeof window !== "undefined" ? window.location.origin : "";

  if (!conectado) {
    return (
      <Card className="max-w-xl bg-zinc-900/50 p-8">
        <div className="flex items-center gap-3">
          <BrandLogo brand="spotify" size="lg" />
          <h2 className="text-xl font-semibold text-white">Modo DJ — Spotify</h2>
        </div>
        <p className="mt-3 text-zinc-400">Conectá tu cuenta de Spotify para empezar.</p>
        <p className="mt-1 text-sm text-zinc-500">Se requiere Spotify Premium para reproducir en el navegador.</p>
        {alerta ? <p className="mt-4 text-sm text-amber-400">{alerta}</p> : null}
        {exito ? <p className="mt-4 text-sm text-emerald-400">Cuenta vinculada correctamente.</p> : null}
        <Button href="/api/spotify/auth" variant="pill" className="mt-6">
          Conectar con Spotify
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {alerta ? <p className="text-sm text-amber-400">{alerta}</p> : null}
      {exito ? <p className="text-sm text-emerald-400">Cuenta vinculada correctamente.</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <Card className="max-w-xl bg-zinc-900/50 p-8">
        <div className="flex items-center gap-3">
          <BrandLogo brand="spotify" size="lg" />
          <h2 className="text-xl font-semibold text-white">Nueva sesión DJ</h2>
        </div>
        <div className="mt-6 space-y-4">
          <div className="block text-sm text-zinc-400">
            <Select label="Playlist" value={playlistId} onChange={(e) => setPlaylistId(e.target.value)}>
              <option value="">Elegí…</option>
              {playlists.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.canReadTracksViaApi}>
                  {p.name} ({p.tracksTotal} temas)
                  {!p.canReadTracksViaApi ? " — solo seguida / no editable por API" : ""}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-xs text-zinc-500">
              Modo DJ solo puede cargar playlists donde vos seas el dueño o colaborador (Spotify bloquea el resto con
              error 403).
            </p>
          </div>
          <Select label="Voz 1 (Locutor A)" value={voz1} onChange={(e) => setVoz1(e.target.value)}>
            {voces.map((rv) => (
              <option key={rv.voz.id} value={rv.voz.geminiVoiceId}>
                {rv.voz.nombre}
              </option>
            ))}
          </Select>
          <Select label="Voz 2 (Locutor B)" value={voz2} onChange={(e) => setVoz2(e.target.value)}>
            {voces.map((rv) => (
              <option key={`${rv.voz.id}-b`} value={rv.voz.geminiVoiceId}>
                {rv.voz.nombre}
              </option>
            ))}
          </Select>
          <Button type="button" variant="pill" disabled={loading} onClick={() => void iniciarSesion()}>
            {loading ? "Iniciando…" : "Iniciar sesión DJ"}
          </Button>
        </div>
        {panelUrl ?
          <Card className="mt-6 border-zinc-700 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-400">Panel OBS</p>
            <p className="mt-1 break-all font-mono text-xs text-amber-200">{panelUrl}</p>
            <a
              href={panelUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-medium text-amber-400 hover:text-amber-300"
            >
              Abrir panel OBS
            </a>
          </Card>
        : null}
      </Card>

      <div>
        <h3 className="text-lg font-medium text-white">Sesiones activas</h3>
        <ul className="mt-3 space-y-2">
          {sesiones.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
              <div>
                <p className="font-medium text-zinc-200">{s.playlistNombre}</p>
                <p className="text-xs text-zinc-500">{s.estado}</p>
              </div>
              <a
                href={`${base}/panel/spotify/${s.id}?token=${encodeURIComponent(s.panelToken)}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-amber-400 hover:text-amber-300"
              >
                Abrir panel
              </a>
            </li>
          ))}
        </ul>
        {sesiones.length === 0 ? <p className="mt-2 text-sm text-zinc-500">No hay sesiones activas.</p> : null}
      </div>
    </div>
  );
}
