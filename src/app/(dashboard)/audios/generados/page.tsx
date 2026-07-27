import { getServerSession } from "next-auth";
import { AudiosGeneradosCatalogo } from "@/components/audios/AudiosGeneradosCatalogo";
import { authOptions } from "@/lib/auth";
import { listarAudiosGenerados } from "@/lib/audios/catalogoGenerados";

export default async function AudiosGeneradosPage(): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);
  const radioId = session?.user?.radioId ?? "";
  const items = radioId ? await listarAudiosGenerados(radioId) : [];

  return <AudiosGeneradosCatalogo initialItems={items} />;
}
