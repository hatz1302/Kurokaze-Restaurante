const Mesa = require('../models/Mesa');
const Producto = require('../models/Producto');
const Orden = require('../models/Orden');

const generarCodigoOrden = () => {
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `KRK-${random}`;
};

const generarComprobante = (metodo) => {
  const prefijo =
    metodo === 'Yape' ? 'YAPE' :
    metodo === 'Plin' ? 'PLIN' :
    metodo === 'Tarjeta' ? 'VISA' : 'BOL';
  const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefijo}-${codigo}`;
};

// --- MESAS ---
const listarMesas = async (req, res) => {
  try {
    const filtro = {};
    if (req.query.piso) {
      filtro.piso = Number(req.query.piso);
    }

    const mesas = await Mesa.find(filtro)
      .populate('ordenActiva')
      .sort({ piso: 1, codigo: 1 });

    res.json(mesas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener mesas', error: error.message });
  }
};

// --- PRODUCTOS ---
const listarProductos = async (req, res) => {
  try {
    const productos = await Producto.find({ activo: true }).sort({ categoria: 1, nombre: 1 });
    res.json(productos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener productos', error: error.message });
  }
};

const alternarDisponibilidadProducto = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    if (typeof req.body?.disponible === 'boolean') {
      producto.disponible = req.body.disponible;
    } else {
      producto.disponible = !producto.disponible;
    }
    await producto.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('producto:actualizado', producto);
    }

    res.json(producto);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar disponibilidad', error: error.message });
  }
};

// --- ÓRDENES ---
const listarOrdenes = async (req, res) => {
  try {
    const filtro = {};
    if (req.query.estado) {
      filtro.estado = req.query.estado;
    }

    const ordenes = await Orden.find(filtro)
      .populate('mozoId', 'nombre rol')
      .sort({ createdAt: -1 });

    res.json(ordenes);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar órdenes', error: error.message });
  }
};

const abrirOrden = async (req, res) => {
  try {
    const { mesaCodigo } = req.body;
    if (!mesaCodigo) {
      return res.status(400).json({ message: 'El código de mesa es obligatorio' });
    }

    const mesa = await Mesa.findOne({ codigo: mesaCodigo });
    if (!mesa) {
      return res.status(404).json({ message: 'Mesa no encontrada' });
    }

    if (mesa.ordenActiva) {
      const ordenExistente = await Orden.findById(mesa.ordenActiva);
      if (ordenExistente && !['PAGADO', 'CANCELADO'].includes(ordenExistente.estado)) {
        return res.status(200).json({ orden: ordenExistente, mesa });
      }
    }

    const nuevaOrden = await Orden.create({
      codigo: generarCodigoOrden(),
      mesaCodigo: mesa.codigo,
      mozoId: req.usuario?.id || null,
      items: [],
      estado: 'CREADO',
      total: 0
    });

    mesa.estado = 'Ocupada';
    mesa.ordenActiva = nuevaOrden._id;
    await mesa.save();

    const io = req.app.get('io');
    if (io) io.emit('mesa:actualizada', mesa);

    res.status(201).json({ orden: nuevaOrden, mesa });
  } catch (error) {
    res.status(500).json({ message: 'Error al abrir orden', error: error.message });
  }
};

const actualizarItemsOrden = async (req, res) => {
  try {
    const { items } = req.body; // [{ productoId, cantidad }]
    const orden = await Orden.findById(req.params.id);

    if (!orden) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    if (['PAGADO', 'CANCELADO'].includes(orden.estado)) {
      return res.status(400).json({ message: 'No se puede modificar una orden cerrada' });
    }

    const itemsConstruidos = [];
    let total = 0;

    for (const item of (items || [])) {
      if (!item.cantidad || item.cantidad <= 0) continue;
      const prod = await Producto.findById(item.productoId);
      if (!prod || !prod.activo) continue;

      const subtotal = prod.precio * item.cantidad;
      total += subtotal;

      itemsConstruidos.push({
        productoId: prod._id,
        nombre: prod.nombre,
        cantidad: item.cantidad,
        precioUnitario: prod.precio
      });
    }

    orden.items = itemsConstruidos;
    orden.total = total;
    await orden.save();

    const io = req.app.get('io');
    if (io) io.emit('orden:actualizada', orden);

    res.json(orden);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar ítems', error: error.message });
  }
};

const enviarACocina = async (req, res) => {
  try {
    const orden = await Orden.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    if (!orden.items || orden.items.length === 0) {
      return res.status(400).json({ message: 'No puedes enviar a cocina una orden vacía' });
    }

    orden.estado = 'EN_COCINA';
    await orden.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('orden:cocina', orden);
      io.emit('orden:actualizada', orden);
    }

    res.json(orden);
  } catch (error) {
    res.status(500).json({ message: 'Error al enviar a cocina', error: error.message });
  }
};

const marcarOrdenLista = async (req, res) => {
  try {
    const orden = await Orden.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    orden.estado = 'LISTO';
    orden.listaEn = new Date();
    await orden.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('orden:lista', {
        ordenId: orden._id,
        codigo: orden.codigo,
        mesaCodigo: orden.mesaCodigo,
        items: orden.items,
        listaEn: orden.listaEn
      });
      io.emit('orden:actualizada', orden);
    }

    res.json(orden);
  } catch (error) {
    res.status(500).json({ message: 'Error al marcar orden como lista', error: error.message });
  }
};

const pedirCuentaOrden = async (req, res) => {
  try {
    const orden = await Orden.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    if (!orden.items || orden.items.length === 0) {
      return res.status(400).json({ message: 'No se puede pedir cuenta de una orden vacía' });
    }

    orden.estado = 'POR_COBRAR';
    await orden.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('orden:actualizada', orden);
      io.emit('orden:por_cobrar', orden);
    }

    res.json(orden);
  } catch (error) {
    res.status(500).json({ message: 'Error al solicitar cuenta', error: error.message });
  }
};

const procesarPago = async (req, res) => {
  try {
    const { metodo, liberarMesa = true, cliente } = req.body;
    const metodosValidos = ['Efectivo', 'Tarjeta', 'Yape', 'Plin'];

    if (!metodosValidos.includes(metodo)) {
      return res.status(400).json({ message: 'Método de pago no válido (Efectivo, Tarjeta, Yape o Plin)' });
    }

    const orden = await Orden.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    let recibidoNum = null;
    let vueltoNum = null;

    if (metodo === 'Efectivo') {
      if (req.body.montoRecibido === '' || req.body.montoRecibido === undefined || req.body.montoRecibido === null) {
        return res.status(400).json({ message: 'Debes ingresar el monto recibido en efectivo' });
      }

      recibidoNum = Number(req.body.montoRecibido);
      if (Number.isNaN(recibidoNum) || recibidoNum < orden.total) {
        return res.status(400).json({
          message: `El monto en efectivo (S/ ${recibidoNum || 0}) no puede ser menor al total (S/ ${orden.total.toFixed(2)})`
        });
      }

      vueltoNum = Number((recibidoNum - orden.total).toFixed(2));
    }

    const dniLimpio = cliente?.dni ? String(cliente.dni).trim() : '';
    const nombreCliente = cliente?.nombre ? String(cliente.nombre).trim() : '';
    const tipoDoc = dniLimpio ? 'DNI' : 'SIMPLE';

    const comprobante = generarComprobante(metodo);
    orden.estado = 'PAGADO';
    orden.pago = {
      metodo,
      montoRecibido: recibidoNum,
      vuelto: vueltoNum,
      comprobante,
      tipoComprobante: tipoDoc,
      clienteDni: dniLimpio || null,
      clienteNombre: nombreCliente || null,
      pagadoEn: new Date()
    };
    await orden.save();

    let mesaActualizada = null;
    if (liberarMesa) {
      mesaActualizada = await Mesa.findOneAndUpdate(
        { codigo: orden.mesaCodigo },
        { estado: 'Libre', ordenActiva: null },
        { new: true }
      );
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('orden:pagada', { orden, mesa: mesaActualizada, comprobante });
      if (mesaActualizada) io.emit('mesa:actualizada', mesaActualizada);
    }

    res.json({ orden, mesa: mesaActualizada, comprobante });
  } catch (error) {
    res.status(500).json({ message: 'Error al procesar pago', error: error.message });
  }
};

const cancelarOrden = async (req, res) => {
  try {
    const orden = await Orden.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    if (orden.estado === 'PAGADO') {
      return res.status(400).json({ message: 'No se puede cancelar una orden ya pagada' });
    }

    orden.estado = 'CANCELADO';
    await orden.save();

    const mesaActualizada = await Mesa.findOneAndUpdate(
      { codigo: orden.mesaCodigo },
      { estado: 'Libre', ordenActiva: null },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('orden:actualizada', orden);
      if (mesaActualizada) io.emit('mesa:actualizada', mesaActualizada);
    }

    res.json({ orden, mesa: mesaActualizada });
  } catch (error) {
    res.status(500).json({ message: 'Error al cancelar orden', error: error.message });
  }
};

module.exports = {
  listarMesas,
  listarProductos,
  alternarDisponibilidadProducto,
  listarOrdenes,
  abrirOrden,
  actualizarItemsOrden,
  enviarACocina,
  cancelarOrden,
  marcarOrdenLista,
  pedirCuentaOrden,
  procesarPago
};