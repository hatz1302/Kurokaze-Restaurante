const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  nombre: { type: String, required: true },
  cantidad: { type: Number, required: true, min: 1 },
  precioUnitario: { type: Number, required: true, min: 0 }
}, { _id: false });

const ordenSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true },
  mesaCodigo: { type: String, required: true },
  mozoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  items: [itemSchema],
  estado: {
    type: String,
    enum: ['CREADO', 'EN_COCINA', 'LISTO', 'POR_COBRAR', 'PROCESANDO', 'PAGADO', 'CANCELADO'],
    default: 'CREADO'
  },
  total: { type: Number, required: true, default: 0 },
  pago: {
    metodo: {
      type: String,
      enum: ['Efectivo', 'Tarjeta', 'Yape', 'Plin', null],
      default: null
    },
    montoRecibido: { type: Number, default: null },
    vuelto: { type: Number, default: null },
    comprobante: { type: String, default: null },
    pagadoEn: { type: Date, default: null }
  },
  listaEn: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Orden', ordenSchema);