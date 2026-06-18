import bcrypt from "bcryptjs";
import { GeneroVoz, Plan, PrismaClient, Rol, TonoVoz } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const elevenLabsVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? "QK4xDwo9ESPHA4JNUpX3";
  const extraVoiceIds = (process.env.ELEVENLABS_VOICE_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const slug = "dejavu";
  const existing = await prisma.radio.findUnique({ where: { slug } });

  const radio =
    existing ??
    (await prisma.radio.create({
      data: {
        nombre: "Radio Dejavu",
        slug,
        ciudad: "Buenos Aires",
        provincia: "Buenos Aires",
        plan: Plan.STARTER,
        fuentesNoticias: [
          "https://www.infobae.com/feeds/rss/",
          "https://www.clarin.com/rss/lo-ultimo/",
          "https://www.lanacion.com.ar/arc/outboundfeeds/rss/",
        ],
        estiloLocucion: "Profesional, cercano y dinamico.",
      },
    }));

  const hashedPassword = await bcrypt.hash("dejavu2024", 12);

  await prisma.usuario.upsert({
    where: { email: "admin@dejavu.com.ar" },
    update: {},
    create: {
      email: "admin@dejavu.com.ar",
      password: hashedPassword,
      nombre: "Admin Dejavu",
      rol: Rol.ADMIN,
      radioId: radio.id,
    },
  });

  const vocesData = [
    { nombre: "Carlos Noticias", genero: GeneroVoz.MASCULINA, tono: TonoVoz.SERIO },
    { nombre: "Laura Noticias", genero: GeneroVoz.FEMENINA, tono: TonoVoz.SERIO },
    { nombre: "Martin Show", genero: GeneroVoz.MASCULINA, tono: TonoVoz.CALIDO },
    { nombre: "Sofia Show", genero: GeneroVoz.FEMENINA, tono: TonoVoz.AMIGABLE },
    { nombre: "Diego Spots", genero: GeneroVoz.MASCULINA, tono: TonoVoz.ENERGETICO },
    { nombre: "Valentina Spots", genero: GeneroVoz.FEMENINA, tono: TonoVoz.ENERGETICO },
  ] as const;

  for (const [index, voz] of vocesData.entries()) {
    const voiceId = extraVoiceIds[index] ?? (index === 0 ? elevenLabsVoiceId : null);
    if (!voiceId) continue;

    const created = await prisma.voz.upsert({
      where: { nombre: voz.nombre },
      update: {
        geminiVoiceId: voiceId,
        idioma: "es-AR",
      },
      create: {
        nombre: voz.nombre,
        descripcion: `${voz.nombre} para uso radial`,
        genero: voz.genero,
        tono: voz.tono,
        geminiVoiceId: voiceId,
      },
    });
    await prisma.radioVoz.upsert({
      where: { radioId_vozId: { radioId: radio.id, vozId: created.id } },
      update: {},
      create: { radioId: radio.id, vozId: created.id },
    });
  }

  await prisma.anunciante.upsert({
    where: { id: "seed-dejavu-pizzeria" },
    update: {
      texto:
        "¿Se te antojó una pizza bien porteña? En Pizzería Roma tenés la promo 2x1 en pizza familiar, martes y jueves de 18 a 22. Pedí al once cinco cinco cinco, doce treinta y cuatro, o pasá por Av. Corrientes. Pizzería Roma, sabor que vuelve.",
      estilo: "energetico",
    },
    create: {
      id: "seed-dejavu-pizzeria",
      radioId: radio.id,
      nombre: "Pizzería Roma",
      rubro: "Gastronomía",
      telefono: "11-5555-1234",
      esActivo: true,
      estilo: "energetico",
      texto:
        "¿Se te antojó una pizza bien porteña? En Pizzería Roma tenés la promo 2x1 en pizza familiar, martes y jueves de 18 a 22. Pedí al once cinco cinco cinco, doce treinta y cuatro, o pasá por Av. Corrientes. Pizzería Roma, sabor que vuelve.",
    },
  });

  await prisma.anunciante.upsert({
    where: { id: "seed-dejavu-gimnasio" },
    update: { esActivo: true, estilo: "energetico" },
    create: {
      id: "seed-dejavu-gimnasio",
      radioId: radio.id,
      nombre: "Gimnasio FitClub",
      rubro: "Deportes",
      esActivo: true,
      estilo: "energetico",
      texto: "Este mes en FitClub, membresía mensual sin matrícula. Entrená con los mejores profes y equipamiento de última generación. FitClub, tu mejor versión empieza hoy.",
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
