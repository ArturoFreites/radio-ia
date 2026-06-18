import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { obtenerStorageStats } from "@/lib/audio/storageGestion";
import { StorageActions } from "@/components/almacenamiento/StorageActions";

export default async function AlmacenamientoPage(): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);
  const radioId = session?.user?.radioId ?? "";
  const initialStats = radioId ? await obtenerStorageStats(radioId) : { totalBytes: 0, categorias: [] };

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Almacenamiento</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Espacio usado por previews, programas generados y audio de Spotify.
        </p>
      </div>
      <StorageActions initialStats={initialStats} />
    </main>
  );
}
