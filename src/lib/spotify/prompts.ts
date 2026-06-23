import { lineasLocutorMonologo, type LocutorPromptConfig } from "@/lib/gemini/locutorPrompt";

export function buildSpotifyPresentacionPrompt(config: {
  trackNombre: string;
  artistaNombre: string;
  albumNombre: string;
  anioAlbum?: string;
  generos?: string[];
  estiloRadio: string;
  locutor?: LocutorPromptConfig;
}): string {
  return `${lineasLocutorMonologo(config.locutor)}Escribe una breve presentación radial de un tema musical. Solo el texto que dirá el locutor, nada más.

TEMA A PRESENTAR:
- Canción: "${config.trackNombre}"
- Artista/Banda: ${config.artistaNombre}
- Álbum: ${config.albumNombre}
${config.anioAlbum ? `- Año: ${config.anioAlbum}` : ""}
${config.generos?.length ? `- Géneros: ${config.generos.join(", ")}` : ""}

ESTILO DE LA RADIO: ${config.estiloRadio}

REGLAS ESTRICTAS:
- Solo texto plano que será leído en voz alta
- Sin markdown, sin asteriscos, sin acotaciones, sin etiquetas de turno
- Sin frases como "Aquí está el guión:" o cualquier introducción
- Mencionar el nombre del tema y del artista
- Incluir UN dato curioso real y verificable del artista, álbum o canción
- Terminar con una frase que deje expectativa antes de que suene el tema
- Máximo 80 palabras (~35 segundos)
- Español rioplatense: voseo, giros naturales del habla porteña, tono directo y cercano, sin exagerar

Escribe únicamente el texto que dirá el locutor.`;
}

export function buildIntroAperturaPrompt(config: {
  radioNombre: string;
  estiloRadio: string;
  locutor?: LocutorPromptConfig;
  primeraCancion?: { nombre: string; artista: string };
}): string {
  const primeraCancionLine = config.primeraCancion
    ? `\nPRIMERA CANCIÓN DE LA SESIÓN: "${config.primeraCancion.nombre}" de ${config.primeraCancion.artista}\nCerrá la apertura con una frase del estilo: "...y arrancamos con '${config.primeraCancion.nombre}' de ${config.primeraCancion.artista}."`
    : "";

  return `${lineasLocutorMonologo(config.locutor)}Escribe una breve apertura radial que da la bienvenida a los oyentes al inicio de la transmisión. Solo el texto que dirá el locutor, nada más.

RADIO: ${config.radioNombre}
ESTILO DE LA RADIO: ${config.estiloRadio}${primeraCancionLine}

REGLAS ESTRICTAS:
- Solo texto plano que será leído en voz alta
- Sin markdown, sin asteriscos, sin acotaciones, sin etiquetas de turno
- Sin frases como "Aquí está el guión:" o cualquier introducción
- Mencionar el nombre de la radio (${config.radioNombre})
- Dar la bienvenida a los oyentes de forma cálida y profesional
- Español rioplatense: voseo, giros naturales del habla porteña, tono directo y cercano, sin exagerar

Escribe únicamente el texto que dirá el locutor.`;
}

export function buildTransicionSlotPrompt(config: {
  programaNombre: string;
  djNombre: string;
  estiloRadio: string;
  locutor?: LocutorPromptConfig;
  primeraCancion?: { nombre: string; artista: string };
}): string {
  const primeraCancionLine = config.primeraCancion
    ? `\nPRIMERA CANCIÓN DEL PROGRAMA: "${config.primeraCancion.nombre}" de ${config.primeraCancion.artista}\nCerrá la transición mencionando que arrancamos con ese tema.`
    : "";

  return `${lineasLocutorMonologo(config.locutor)}Escribe una transición radial breve que presenta el programa que viene a continuación. Solo el texto que dirá el locutor, nada más.

PROGRAMA ENTRANTE: ${config.programaNombre}
LOCUTOR / DJ: ${config.djNombre}
ESTILO DE LA RADIO: ${config.estiloRadio}${primeraCancionLine}

REGLAS ESTRICTAS:
- Solo texto plano que será leído en voz alta
- Sin markdown, sin asteriscos, sin acotaciones, sin etiquetas de turno
- Sin frases como "Aquí está el guión:" o cualquier introducción
- Despedí brevemente lo que termina y presentá el programa entrante por nombre
- Tono de continuidad en vivo, no apertura de emisora
- Máximo 60 palabras
- Español rioplatense: voseo, giros naturales del habla porteña, tono directo y cercano, sin exagerar

Escribe únicamente el texto que dirá el locutor.`;
}
