import type { EstadoPagoPublicidad } from "@prisma/client";

export type FilaPagoPublicidad = {
  pagoId: string;
  anuncianteId: string;
  nombre: string;
  rubro: string | null;
  esActivo: boolean;
  montoAcordado: number | null;
  monto: number | null;
  estado: EstadoPagoPublicidad;
  fechaPago: string | null;
  notas: string | null;
};

export type ResumenPagosPublicidad = {
  periodo: {
    anio: number;
    mes: number;
    etiqueta: string;
  };
  totales: {
    acordado: number;
    cobrado: number;
    pendiente: number;
    pagados: number;
    totalClientes: number;
  };
  filas: FilaPagoPublicidad[];
};

export type PublicidadCliente = {
  id: string;
  nombre: string;
  rubro: string | null;
  esActivo: boolean;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  montoMensual: number | null;
  texto: string | null;
  estilo: string;
  audioUrl: string | null;
  duracion: number | null;
};

export type EstiloPublicidad = "energetico" | "elegante" | "humoristico";
