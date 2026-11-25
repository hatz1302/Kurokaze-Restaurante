const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  rol: {
    type: String,
    enum: ['Mozo', 'Cocinero', 'Cajero', 'Admin'],
    default: 'Mozo'
  }
}, { timestamps: true });

module.exports = mongoose.model('Usuario', usuarioSchema);