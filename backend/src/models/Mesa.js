const mongoose = require('mongoose');

const mesaSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true, trim: true }, 
  piso: { type: Number, required: true, min: 1, max: 3 },
  capacidad: { type: Number, default: 4 },
  estado: {
    type: String,
    enum: ['Libre', 'Ocupada'],
    default: 'Libre'
  },
  ordenActiva: { type: mongoose.Schema.Types.ObjectId, ref: 'Orden', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Mesa', mesaSchema);