export type PatchConfigBody = {
  nombre?: string;
  estiloLocucion?: string;
};

export type ConfiguracionResponse = {
  nombre: string;
  estiloLocucion: string | null;
  aireToken: string;
  urlAire: string;
};
