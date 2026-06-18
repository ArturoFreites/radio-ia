"use client";

import { Music2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export type PlaylistPickerItem = {
  id: string;
  nombre: string;
  coverUrl?: string;
  trackCount?: number;
  esPropia?: boolean;
  genero?: string;
  descripcion?: string;
};

export type PlaylistPickerProps = {
  playlists: PlaylistPickerItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  loading?: boolean;
  error?: string | null;
  spotifyConnected?: boolean;
  showSearch?: boolean;
  showTabs?: boolean;
  showDetail?: boolean;
  className?: string;
};

type FiltroTab = "todos" | "propias" | "genero";

export function PlaylistPicker({
  playlists,
  selectedId,
  onSelect,
  loading = false,
  error = null,
  spotifyConnected = true,
  showSearch = false,
  showTabs = false,
  showDetail = false,
  className,
}: PlaylistPickerProps): React.ReactElement {
  const [busqueda, setBusqueda] = useState("");
  const [tab, setTab] = useState<FiltroTab>("todos");

  const filtradas = useMemo(() => {
    let list = playlists;
    if (tab === "propias") list = list.filter((p) => p.esPropia !== false);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      list = list.filter((p) => p.nombre.toLowerCase().includes(q));
    }
    return list;
  }, [playlists, tab, busqueda]);

  const seleccionada = playlists.find((p) => p.id === selectedId);

  if (!spotifyConnected) {
    return (
      <EmptyState
        icon={<BrandLogo brand="spotify" size="lg" />}
        title="Spotify no conectado"
        description="Conectá tu cuenta de Spotify para elegir playlists en los slots DJ."
        actionLabel="Conectar Spotify"
        actionHref="/api/spotify/auth"
      />
    );
  }

  if (loading) {
    return <p className="text-sm text-[color:var(--muted)]">Cargando playlists…</p>;
  }

  if (error) {
    return (
      <EmptyState
        icon={<BrandLogo brand="spotify" size="lg" />}
        title="Error al cargar playlists"
        description={error}
      />
    );
  }

  if (playlists.length === 0) {
    return (
      <EmptyState
        icon={<BrandLogo brand="spotify" size="lg" />}
        title="Sin playlists"
        description="No encontramos playlists en tu cuenta de Spotify."
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showSearch ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted)]" />
          <Input
            placeholder="Buscar playlist…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
      ) : null}

      {showTabs ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: "todos" as const, label: "Todos" },
              { id: "propias" as const, label: "Mis playlists" },
              { id: "genero" as const, label: "Por género" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                tab === item.id
                  ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                  : "bg-[color:var(--surface-2)] text-[color:var(--muted)] hover:text-[color:var(--text)]",
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtradas.map((playlist) => {
          const selected = playlist.id === selectedId;
          return (
            <Card
              key={playlist.id}
              interactive
              className={cn(
                "flex items-center gap-4 p-3",
                selected ? "border-[color:var(--primary)] ring-1 ring-[color:var(--primary)]/40" : undefined,
              )}
              onClick={() => onSelect(playlist.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  onSelect(playlist.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[color:var(--surface-2)]">
                {playlist.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={playlist.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[color:var(--muted)]">
                    <Music2 className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[color:var(--text)]">{playlist.nombre}</p>
                {playlist.trackCount !== undefined ? (
                  <p className="text-xs text-[color:var(--muted)]">{playlist.trackCount} temas</p>
                ) : null}
              </div>
              {selected ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)] text-[color:var(--primary-foreground)]">
                  ✓
                </span>
              ) : null}
            </Card>
          );
        })}
      </div>

      {showDetail && seleccionada ? (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col sm:flex-row">
            <div className="aspect-square w-full shrink-0 bg-[color:var(--surface-2)] sm:w-40">
              {seleccionada.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={seleccionada.coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[color:var(--muted)]">
                  <Music2 className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between gap-3 p-4">
              <div>
                <h3 className="text-lg font-semibold text-[color:var(--text)]">{seleccionada.nombre}</h3>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {seleccionada.descripcion ?? "Playlist seleccionada para este slot DJ."}
                </p>
                {seleccionada.trackCount !== undefined ? (
                  <p className="mt-2 text-xs text-[color:var(--muted)]">{seleccionada.trackCount} temas</p>
                ) : null}
              </div>
              <Button className="w-full sm:w-auto" onClick={() => onSelect(seleccionada.id)}>
                Seleccionar playlist
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <p className="inline-flex items-center gap-2 text-xs text-[color:var(--muted)]">
        <BrandLogo brand="spotify" size="xs" />
        Spotify conectado
      </p>
    </div>
  );
}
