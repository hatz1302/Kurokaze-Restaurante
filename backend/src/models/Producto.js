const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  precio: { type: Number, required: true, min: 0 },
  categoria: {
    type: String,
    enum: ['Entrada', 'Ramen & Platos', 'Sushi & Rolls', 'Bar & Bebidas', 'Postre'],
    default: 'Ramen & Platos'
  },
  activo: { type: Boolean, default: true },
  disponible: { type: Boolean, default: true }
}, { timestamps: true });



module.exports = mongoose.model('Producto', productoSchema);