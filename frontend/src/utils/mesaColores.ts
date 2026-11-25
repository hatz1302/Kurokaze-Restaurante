import type { EstadoOrden, Mesa, Orden } from '../types/kurokaze';

export interface EstiloMesa {
  etiqueta: string;
  claseTarjeta: string;
  clasePunto: string;
}

export function obtenerEstiloMesa(mesa: Mesa, ordenActiva?: Orden | null): EstiloMesa {
  const estadoOrden: EstadoOrden | undefined = ordenActiva?.estado;

  if (mesa.estado === 'Libre' || !ordenActiva || estadoOrden === 'CANCELADO') {
    return {
      etiqueta: 'Libre',
      claseTarjeta: 'bg-white text-neutral-900 border-neutral-300',
      clasePunto: 'bg-white border border-neutral-400',
    };
  }

  if (estadoOrden === 'PAGADO') {
    return {
      etiqueta: 'Pagado',
      claseTarjeta: 'bg-sky-500/15 text-sky-200 border-sky-400/50',
      clasePunto: 'bg-sky-400',
    };
  }

  if (estadoOrden === 'LISTO') {
    return {
      etiqueta: 'Plato listo',
      claseTarjeta: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/50',
      clasePunto: 'bg-emerald-400',
    };
  }

  // CREADO, EN_COCINA o PROCESANDO
  return {
    etiqueta: estadoOrden === 'EN_COCINA' ? 'En cocina' : 'Ocupada',
    claseTarjeta: 'bg-amber-500/15 text-amber-200 border-amber-400/50',
    clasePunto: 'bg-amber-400',
  };
}

export const LEYENDA_MESAS = [
  { etiqueta: 'Libre', clasePunto: 'bg-white border border-neutral-400' },
  { etiqueta: 'En cocina / Ocupada', clasePunto: 'bg-amber-400' },
  { etiqueta: 'Plato listo', clasePunto: 'bg-emerald-400' },
  { etiqueta: 'Pagado', clasePunto: 'bg-sky-400' },
];