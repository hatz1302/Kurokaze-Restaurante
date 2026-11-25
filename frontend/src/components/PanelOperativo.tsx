import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import {
  Bell,
  ChefHat,
  CreditCard,
  Flame,
  LogOut,
  Plus,
  Minus,
  Send,
  CheckCircle2,
  Receipt,
  UtensilsCrossed,
  Printer,
  Ban,
} from 'lucide-react';
import type { ItemOrden, Mesa, MetodoPago, Orden, Producto } from '../types/kurokaze';
import { LEYENDA_MESAS, obtenerEstiloMesa } from '../utils/mesaColores';
import { limpiarSesion, obtenerToken, obtenerUsuario } from '../utils/sesion';

const API_URL = 'http://localhost:4000/api';
const SOCKET_URL = 'http://localhost:4000';
const METODOS_PAGO: MetodoPago[] = ['Efectivo', 'Tarjeta', 'Yape', 'Plin'];

const money = (v: number) =>
  v.toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  });

interface PanelOperativoProps {
  vista: 'mesas' | 'cocina' | 'caja' | 'admin';
}

export function PanelOperativo({ vista }: PanelOperativoProps) {
  const navigate = useNavigate();
  const token = obtenerToken();
  const usuario = obtenerUsuario();

  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [pisoActivo, setPisoActivo] = useState<number | 'TODOS'>('TODOS');
  const [mesaSeleccionadaCodigo, setMesaSeleccionadaCodigo] = useState<string | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [tipoBoleta, setTipoBoleta] = useState<'SIMPLE' | 'DNI'>('SIMPLE');
  const [dniCliente, setDniCliente] = useState<string>('');
  const [nombreCliente, setNombreCliente] = useState<string>('');
  const [boletaEmitida, setBoletaEmitida] = useState<Orden | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const mostrarAviso = (msg: string) => {
    setAviso(msg);
    setTimeout(() => setAviso(null), 4000);
  };

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ''}`,
    }),
    [token]
  );

  const cerrarSesion = () => {
    limpiarSesion();
    navigate('/login', { replace: true });
  };

  const cargarTodo = async (jwtToken: string) => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwtToken}`,
    };

    try {
      const [resMesas, resProds, resOrds] = await Promise.all([
        fetch(`${API_URL}/mesas`, { headers }),
        fetch(`${API_URL}/productos`, { headers }),
        fetch(`${API_URL}/ordenes`, { headers }),
      ]);

      if (resMesas.status === 401 || resOrds.status === 401) {
        cerrarSesion();
        return;
      }

      if (resMesas.ok) setMesas(await resMesas.json());
      if (resProds.ok) setProductos(await resProds.json());
      if (resOrds.ok) setOrdenes(await resOrds.json());
    } catch {
      mostrarAviso('No se pudo cargar datos del backend');
    }
  };

  useEffect(() => {
    if (!token || !usuario) return;
    cargarTodo(token);

    const socket: Socket = io(SOCKET_URL);

    socket.on('orden:cocina', (orden: Orden) => {
      cargarTodo(token);
      if (usuario.rol === 'Cocinero' || usuario.rol === 'Admin') {
        mostrarAviso(`Nueva comanda en cocina: Mesa ${orden.mesaCodigo} (${orden.codigo})`);
      }
    });

    socket.on('orden:lista', (payload: { mesaCodigo: string; codigo: string }) => {
      cargarTodo(token);
      if (usuario.rol === 'Mozo' || usuario.rol === 'Admin') {
        mostrarAviso(`¡Pedido LISTO para Mesa ${payload.mesaCodigo} (${payload.codigo})! Pasar a recoger`);
      }
    });

    socket.on('orden:por_cobrar', (orden: Orden) => {
      cargarTodo(token);
      if (usuario.rol === 'Cajero' || usuario.rol === 'Admin') {
        mostrarAviso(`Mesa ${orden.mesaCodigo} pidió cuenta (${money(orden.total)})`);
      }
    });

    socket.on('producto:actualizado', (prod: Producto) => {
      setProductos((prev) => prev.map((p) => (p._id === prod._id ? prod : p)));
      if (prod.disponible === false && (usuario.rol === 'Mozo' || usuario.rol === 'Admin')) {
        mostrarAviso(`"${prod.nombre}" marcado como AGOTADO en cocina`);
      }
    });

    socket.on('orden:actualizada', () => cargarTodo(token));
    socket.on('orden:pagada', () => cargarTodo(token));
    socket.on('mesa:actualizada', () => cargarTodo(token));

    return () => {
      socket.disconnect();
    };
  }, [token, usuario?.rol]);

  if (!token || !usuario) return null;

  const mesaSeleccionada = mesas.find((m) => m.codigo === mesaSeleccionadaCodigo) || null;
  const ordenActivaMesa = mesaSeleccionada
    ? ordenes.find(
        (o) => o.mesaCodigo === mesaSeleccionada.codigo && !['PAGADO', 'CANCELADO'].includes(o.estado)
      ) || null
    : null;

  const mesasFiltradas =
    pisoActivo === 'TODOS' ? mesas : mesas.filter((m) => m.piso === pisoActivo);

  const ordenesCocina = ordenes.filter((o) => o.estado === 'EN_COCINA');
  const ordenesPorCobrar = ordenes.filter(
    (o) => ['POR_COBRAR', 'LISTO', 'EN_COCINA', 'CREADO'].includes(o.estado) && o.items.length > 0
  );

  const abrirMesaYOrden = async (mesaCodigo: string) => {
    setMesaSeleccionadaCodigo(mesaCodigo);
    if (!['Mozo', 'Admin'].includes(usuario.rol)) return;
    const res = await fetch(`${API_URL}/ordenes`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ mesaCodigo }),
    });
    if (res.ok) await cargarTodo(token);
  };

  const modificarCantidad = async (orden: Orden, productoId: string, delta: number) => {
    const mapa = new Map<string, number>();
    orden.items.forEach((it) => mapa.set(it.productoId, it.cantidad));
    const siguiente = (mapa.get(productoId) || 0) + delta;
    if (siguiente <= 0) mapa.delete(productoId);
    else mapa.set(productoId, siguiente);

    const itemsPayload = Array.from(mapa.entries()).map(([pid, cantidad]) => ({
      productoId: pid,
      cantidad,
    }));

    const res = await fetch(`${API_URL}/ordenes/${orden._id}/items`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ items: itemsPayload }),
    });
    if (res.ok) await cargarTodo(token);
  };

  const enviarOrdenACocina = async (ordenId: string) => {
    const res = await fetch(`${API_URL}/ordenes/${ordenId}/cocina`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) {
      mostrarAviso(data.message || 'No se pudo enviar a cocina');
      return;
    }
    mostrarAviso('Orden enviada a cocina/barra');
    await cargarTodo(token);
  };

  const pedirCuenta = async (ordenId: string) => {
    const res = await fetch(`${API_URL}/ordenes/${ordenId}/pedir-cuenta`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    if (res.ok) {
      mostrarAviso('Cuenta solicitada a Caja');
      await cargarTodo(token);
    }
  };

  const cancelarYLiberarMesa = async (ordenId: string) => {
    const res = await fetch(`${API_URL}/ordenes/${ordenId}/cancelar`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    if (res.ok) {
      setMesaSeleccionadaCodigo(null);
      mostrarAviso('Orden cancelada y mesa liberada');
      await cargarTodo(token);
    }
  };

  const marcarListaEnCocina = async (ordenId: string) => {
    const res = await fetch(`${API_URL}/ordenes/${ordenId}/listo`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    if (res.ok) {
      mostrarAviso('Pedido marcado como LISTO');
      await cargarTodo(token);
    }
  };

  const toggleAgotado = async (prod: Producto) => {
    const res = await fetch(`${API_URL}/productos/${prod._id}/disponibilidad`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ disponible: prod.disponible === false ? true : false }),
    });
    if (res.ok) await cargarTodo(token);
  };

  const cobrarOrden = async (orden: Orden) => {
    const dniLimpio = dniCliente.trim();

    if (tipoBoleta === 'DNI' && !/^\d{8}$/.test(dniLimpio)) {
      mostrarAviso('Ingresa un DNI válido de 8 dígitos para emitir boleta con DNI');
      return;
    }

    let recibido: number | undefined = undefined;
    if (metodoPago === 'Efectivo') {
      if (!montoRecibido.trim()) {
        mostrarAviso('El monto recibido en efectivo es obligatorio antes de cobrar');
        return;
      }
      recibido = Number(montoRecibido);
      if (Number.isNaN(recibido) || recibido < orden.total) {
        mostrarAviso(`El efectivo ingresado debe ser al menos ${money(orden.total)}`);
        return;
      }
    }

    const res = await fetch(`${API_URL}/ordenes/${orden._id}/pagar`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        metodo: metodoPago,
        montoRecibido: recibido,
        liberarMesa: true,
        cliente: {
          dni: tipoBoleta === 'DNI' ? dniLimpio : '',
          nombre: tipoBoleta === 'DNI' ? nombreCliente.trim() : '',
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      mostrarAviso(data.message || 'Error al cobrar');
      return;
    }

    setBoletaEmitida(data.orden);
    setMontoRecibido('');
    setDniCliente('');
    setNombreCliente('');
    mostrarAviso(`Cobrado con ${metodoPago} · Comprobante: ${data.comprobante}`);
    await cargarTodo(token);
  };

  const mostrarMesas = vista === 'mesas' || vista === 'admin';
  const mostrarCocina = vista === 'cocina' || vista === 'admin';
  const mostrarCaja = vista === 'caja' || vista === 'admin';

  const totalVendidoHoy = ordenes
    .filter((o) => o.estado === 'PAGADO')
    .reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-white/10 bg-neutral-900/70 backdrop-blur sticky top-0 z-20 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Flame className="w-6 h-6 text-amber-400"/>
            <div>
              <h1 className="font-bold tracking-wide text-lg leading-none">KUROKAZE</h1>
              <span className="text-xs text-neutral-400">Ruta activa: /{vista}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {vista === 'admin' && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                Ventas hoy: {money(totalVendidoHoy)}
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-medium">
              {usuario.nombre} · {usuario.rol}
            </span>
            <button
              onClick={cerrarSesion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs"
            >
              <LogOut className="w-3.5 h-3.5"/> Salir
            </button>
          </div>
        </div>
      </header>

      {aviso && (
        <div className="max-w-7xl mx-auto px-4 pt-4 print:hidden">
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-sm text-emerald-200 flex items-center gap-2">
            <Bell className="w-4 h-4 shrink-0 text-emerald-300"/>
            <span>{aviso}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {mostrarMesas && (
          <section className="lg:col-span-7 space-y-4 print:hidden">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-base flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-amber-400"/> Mesas y Zonas
                </h2>
                <div className="flex items-center gap-1.5">
                  {(['TODOS', 1, 2, 3] as const).map((p) => (
                    <button
                      key={String(p)}
                      onClick={() => setPisoActivo(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs border transition ${
                        pisoActivo === p
                          ? 'bg-amber-500 text-neutral-950 font-semibold border-amber-400'
                          : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {p === 'TODOS' ? 'Todos' : p === 3 ? 'Barra' : `Piso ${p}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-white/10 text-xs text-neutral-300">
                {LEYENDA_MESAS.map((item) => (
                  <div key={item.etiqueta} className="inline-flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-full ${item.clasePunto}`} />
                    <span>{item.etiqueta}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {mesasFiltradas.map((mesa) => {
                const ordenDeMesa = ordenes.find(
                  (o) => o.mesaCodigo === mesa.codigo && !['PAGADO', 'CANCELADO'].includes(o.estado)
                );
                const estilo = obtenerEstiloMesa(mesa, ordenDeMesa);
                const seleccionada = mesa.codigo === mesaSeleccionadaCodigo;

                return (
                  <button
                    key={mesa._id}
                    onClick={() => abrirMesaYOrden(mesa.codigo)}
                    className={`p-3.5 rounded-2xl border text-left transition ${estilo.claseTarjeta} ${
                      seleccionada ? 'ring-2 ring-amber-400' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{mesa.codigo}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${estilo.clasePunto}`} />
                    </div>
                    <div className="text-xs opacity-80 mt-1">{estilo.etiqueta}</div>
                    {ordenDeMesa && ordenDeMesa.total > 0 && (
                      <div className="text-xs font-semibold mt-1.5">{money(ordenDeMesa.total)}</div>
                    )}
                  </button>
                );
              })}
            </div>

            {mesaSeleccionada && ordenActivaMesa && ['Mozo', 'Admin'].includes(usuario.rol) && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base">
                      Mesa {mesaSeleccionada.codigo} · {ordenActivaMesa.codigo}
                    </h3>
                    <span className="text-xs text-amber-300">Estado: {ordenActivaMesa.estado}</span>
                  </div>
                  <span className="font-bold text-base text-amber-400">
                    {money(ordenActivaMesa.total)}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-neutral-400">Carta Kurokaze:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {productos.map((prod) => {
                      const agotado = prod.disponible === false;
                      return (
                        <div
                          key={prod._id}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                            agotado
                              ? 'bg-neutral-900/40 border-rose-500/20 opacity-60'
                              : 'bg-neutral-900/80 border-white/10'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-neutral-100">
                              {prod.nombre}{' '}
                              {agotado && (
                                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                                  Agotado
                                </span>
                              )}
                            </p>
                            <p className="text-neutral-400">{money(prod.precio)}</p>
                          </div>
                          <button
                            disabled={agotado}
                            onClick={() => modificarCantidad(ordenActivaMesa, prod._id, 1)}
                            className="p-1.5 rounded-lg bg-amber-500 disabled:bg-neutral-700 text-neutral-950 hover:bg-amber-400"
                          >
                            <Plus className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs text-neutral-400">Detalle de orden:</p>
                  {ordenActivaMesa.items.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic">Sin platos ni bebidas aún.</p>
                  ) : (
                    ordenActivaMesa.items.map((it) => (
                      <div
                        key={it.productoId}
                        className="flex items-center justify-between text-xs bg-white/[0.03] rounded-xl px-3 py-2"
                      >
                        <span>
                          {it.cantidad}x {it.nombre}
                        </span>
                        <div className="flex items-center gap-2">
                          <span>{money(it.cantidad * it.precioUnitario)}</span>
                          <button
                            onClick={() => modificarCantidad(ordenActivaMesa, it.productoId, -1)}
                            className="p-1 rounded bg-white/10 hover:bg-white/20"
                          >
                            <Minus className="w-3 h-3"/>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {ordenActivaMesa.items.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => enviarOrdenACocina(ordenActivaMesa._id)}
                      className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5"/> Enviar a Cocina
                    </button>
                    <button
                      onClick={() => pedirCuenta(ordenActivaMesa._id)}
                      className="py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5"/> Pedir cuenta a Caja
                    </button>
                  </div>
                )}

                <button
                  onClick={() => cancelarYLiberarMesa(ordenActivaMesa._id)}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/15 hover:border-rose-400/40 text-xs text-rose-200 transition"
                >
                  Cancelar orden y liberar mesa
                </button>
              </div>
            )}
          </section>
        )}

        <section className={`${mostrarMesas ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-4`}>
          {mostrarCocina && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-4 print:hidden">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-amber-400"/> Cocina ({ordenesCocina.length} en preparación)
              </h3>

              {ordenesCocina.length === 0 ? (
                <p className="text-xs text-neutral-400">No hay órdenes pendientes en cocina.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ordenesCocina.map((ord) => (
                    <div
                      key={ord._id}
                      className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 space-y-2 text-xs"
                    >
                      <div className="flex justify-between font-semibold">
                        <span>Mesa {ord.mesaCodigo}</span>
                        <span>{ord.codigo}</span>
                      </div>
                      <ul className="space-y-1 text-neutral-200">
                        {ord.items.map((i) => (
                          <li key={i.productoId}>
                            • {i.cantidad}x {i.nombre}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => marcarListaEnCocina(ord._id)}
                        className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4"/> Marcar LISTO
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-white/10 space-y-2">
                <p className="text-xs font-medium text-neutral-300">Disponibilidad de carta (Agotados):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {productos.map((prod) => {
                    const agotado = prod.disponible === false;
                    return (
                      <div
                        key={prod._id}
                        className="flex items-center justify-between rounded-xl bg-neutral-900/80 border border-white/10 px-3 py-2 text-xs"
                      >
                        <span className="truncate pr-2">{prod.nombre}</span>
                        <button
                          onClick={() => toggleAgotado(prod)}
                          className={`px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1 shrink-0 ${
                            agotado
                              ? 'bg-rose-500/20 text-rose-200 border border-rose-400/40'
                              : 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
                          }`}
                        >
                          <Ban className="w-3 h-3"/>
                          {agotado ? 'Agotado' : 'Disponible'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {mostrarCaja && (() => {
            const hoy = new Date().toLocaleDateString('es-PE');
            const ventasHoy = ordenes.filter((o) => {
              if (o.estado !== 'PAGADO') return false;
              const fechaOrd = new Date(o.pago?.pagadoEn || o.createdAt || Date.now()).toLocaleDateString('es-PE');
              return fechaOrd === hoy;
            });

            const totalesPorMetodo: Record<string, number> = {
              Efectivo: 0,
              Yape: 0,
              Plin: 0,
              Tarjeta: 0,
            };

            ventasHoy.forEach((v) => {
              const m = v.pago?.metodo || 'Efectivo';
              totalesPorMetodo[m] = (totalesPorMetodo[m] || 0) + v.total;
            });

            const totalDia = ventasHoy.reduce((acc, v) => acc + v.total, 0);

            return (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm">Ventas del Día ({ventasHoy.length} boletas)</h3>
                    <p className="text-[11px] text-neutral-400">Registro persistente de cobros emitidos hoy</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                    Total: {money(totalDia)}
                  </span>
                </div>

                {/* Mini resumen por método de pago */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  {(['Efectivo', 'Yape', 'Plin', 'Tarjeta'] as const).map((m) => (
                    <div
                      key={m}
                      className="rounded-xl bg-neutral-900/80 border border-white/10 px-2.5 py-2"
                    >
                      <span className="text-neutral-400 block">{m}</span>
                      <span className="font-semibold text-neutral-100">{money(totalesPorMetodo[m] || 0)}</span>
                    </div>
                  ))}
                </div>

                {/* Tabla de boletas emitidas */}
                {ventasHoy.length === 0 ? (
                  <p className="text-xs text-neutral-400">Aún no hay ventas cobradas hoy.</p>
                ) : (
                  <div className="overflow-x-auto max-h-60 overflow-y-auto rounded-xl border border-white/10">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-neutral-900 text-neutral-400 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">Hora</th>
                          <th className="py-2 px-2.5">Boleta</th>
                          <th className="py-2 px-2.5">Mesa</th>
                          <th className="py-2 px-2.5">Cliente / DNI</th>
                          <th className="py-2 px-2.5">Pago</th>
                          <th className="py-2 px-2.5 text-right">Total</th>
                          <th className="py-2 px-2.5 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 bg-neutral-950/60">
                        {ventasHoy.map((venta) => {
                          const hora = new Date(venta.pago?.pagadoEn || venta.createdAt || Date.now()).toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                          return (
                            <tr key={venta._id} className="hover:bg-white/[0.03]">
                              <td className="py-2 px-2.5 text-neutral-300 whitespace-nowrap">{hora}</td>
                              <td className="py-2 px-2.5 font-mono text-amber-300 whitespace-nowrap">
                                {venta.pago?.comprobante || venta.codigo}
                              </td>
                              <td className="py-2 px-2.5">{venta.mesaCodigo}</td>
                              <td className="py-2 px-2.5 text-neutral-300">
                                {venta.pago?.clienteDni
                                  ? `${venta.pago.clienteDni}${venta.pago.clienteNombre ? ` · ${venta.pago.clienteNombre}` : ''}`
                                  : 'Simple'}
                              </td>
                              <td className="py-2 px-2.5">{venta.pago?.metodo || '-'}</td>
                              <td className="py-2 px-2.5 text-right font-semibold">{money(venta.total)}</td>
                              <td className="py-2 px-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setBoletaEmitida(venta)}
                                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-100"
                                >
                                  Ver boleta
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Boleta de Venta estilo ticket (Simple o con DNI) */}
          {boletaEmitida && (
            <div className="rounded-2xl border border-white/20 bg-white text-neutral-950 p-5 space-y-3 text-xs shadow-lg max-w-md mx-auto">
              <div className="text-center border-b border-dashed border-neutral-300 pb-3 space-y-0.5">
                <p className="font-bold text-base tracking-wide">KUROKAZE</p>
                <p className="font-semibold text-[11px]">KUROKAZE RESTAURANTE · BAR S.A.C.</p>
                <p className="text-[11px] text-neutral-600">R.U.C.: 20601234561 · Arequipa, Perú</p>
                <p className="font-bold text-xs pt-1.5">BOLETA DE VENTA ELECTRÓNICA</p>
                <p className="font-mono font-semibold text-xs">
                  {boletaEmitida.pago?.comprobante || boletaEmitida.codigo}
                </p>
              </div>

              <div className="flex justify-between text-[11px] text-neutral-700 border-b border-dashed border-neutral-300 pb-2">
                <span>
                  Fecha:{' '}
                  {new Date(boletaEmitida.pago?.pagadoEn || Date.now()).toLocaleDateString('es-PE')}
                </span>
                <span>
                  Hora:{' '}
                  {new Date(boletaEmitida.pago?.pagadoEn || Date.now()).toLocaleTimeString('es-PE')}
                </span>
              </div>

              <div className="text-[11px] space-y-0.5 border-b border-dashed border-neutral-300 pb-2">
                <p>
                  <span className="font-semibold">Mesa:</span> {boletaEmitida.mesaCodigo} ·{' '}
                  <span className="font-semibold">Pago:</span> {boletaEmitida.pago?.metodo}
                </p>
                {boletaEmitida.pago?.clienteDni ? (
                  <p className="font-semibold text-neutral-900">
                    Cliente: {boletaEmitida.pago.clienteNombre || 'Consumidor'} · DNI:{' '}
                    {boletaEmitida.pago.clienteDni}
                  </p>
                ) : (
                  <p className="text-neutral-600">Cliente: Público General (Boleta Simple)</p>
                )}
              </div>

              <div className="space-y-1 border-b border-dashed border-neutral-300 pb-3">
                <div className="grid grid-cols-12 font-semibold text-[11px] text-neutral-600 pb-1">
                  <span className="col-span-6">Descripción</span>
                  <span className="col-span-2 text-center">Cant.</span>
                  <span className="col-span-4 text-right">Subtotal</span>
                </div>
                {boletaEmitida.items.map((it: ItemOrden) => (
                  <div key={it.productoId} className="grid grid-cols-12 text-[11px]">
                    <span className="col-span-6 pr-1">{it.nombre}</span>
                    <span className="col-span-2 text-center">{it.cantidad}</span>
                    <span className="col-span-4 text-right">
                 {money(it.cantidad * it.precioUnitario)}
                    </span>
                  </div>
                ))}
              </div>

              {(() => {
                const total = boletaEmitida.total;
                const gravada = Number((total / 1.18).toFixed(2));
                const igv = Number((total - gravada).toFixed(2));
                return (
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-neutral-600">
                      <span>OP. GRAVADA:</span>
                      <span>{money(gravada)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>IGV (18%):</span>
                      <span>{money(igv)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm pt-1 border-t border-neutral-300">
                      <span>TOTAL:</span>
                      <span>{money(total)}</span>
                    </div>
                    {boletaEmitida.pago?.metodo === 'Efectivo' &&
                      boletaEmitida.pago?.montoRecibido != null && (
                        <>
                          <div className="flex justify-between text-neutral-700 pt-1">
                            <span>Efectivo recibido:</span>
                            <span>{money(boletaEmitida.pago.montoRecibido)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-emerald-700">
                            <span>Vuelto:</span>
                            <span>{money(boletaEmitida.pago.vuelto || 0)}</span>
                          </div>
                        </>
                      )}
                  </div>
                );
              })()}

              <div className="pt-2 flex gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5"/> Imprimir Boleta
                </button>
                <button
                  onClick={() => setBoletaEmitida(null)}
                  className="px-3 py-2 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}