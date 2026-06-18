export type ConfigNoticias = {
  cantidadNoticias: number;
  categorias: string[];
  enfoque: "local" | "nacional" | "internacional";
  fuentesRSS: string[];
  duracionObjetivo: number;
};

export type ConfigCuna = {
  anuncianteId?: string;
  producto: string;
  oferta?: string;
  telefono?: string;
  direccion?: string;
  estilo: "energetico" | "elegante" | "humoristico";
  duracionObjetivo: number;
};

export type ConfigEntretenimiento = {
  subtipos: ("efemerides" | "clima" | "horoscopo" | "trivia")[];
  ciudadClima?: string;
  duracionObjetivo: number;
};
