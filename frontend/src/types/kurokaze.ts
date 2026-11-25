export type Rol = 'Mozo' | 'Cocinero' | 'Cajero' | 'Admin';

export type EstadoOrden =
  | 'CREADO'
  | 'EN_COCINA'
  | 'LISTO'
  | 'POR_COBRAR'
  | 'PROCESANDO'
  | 'PAGADO'
  | 'CANCELADO';

export type MetodoPago = 'Efectivo' | 'Tarjeta' | 'Yape' | 'Plin';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface ItemOrden {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface PagoInfo {
  metodo: MetodoPago | null;
  montoRecibido?: number | null;
  vuelto?: number | null;
  comprobante?: string | null;
  tipoComprobante?: 'SIMPLE' | 'DNI';
  clienteDni?: string | null;
  clienteNombre?: string | null;
  pagadoEn?: string | null;
}

export interface Orden {
  _id: string;
  codigo: string;
  mesaCodigo: string;
  items: ItemOrden[];
  estado: EstadoOrden;
  total: number;
  pago?: PagoInfo;
  listaEn?: string | null;
  createdAt?: string;
}

export interface Mesa {
  _id: string;
  codigo: string;
  piso: number;
  capacidad: number;
  estado: 'Libre' | 'Ocupada';
  ordenActiva?: Orden | string | null;
}

export interface Producto {
  _id: string;
  nombre: string;
  precio: number;
  categoria: string;
  activo: boolean;
  disponible?: boolean;
}