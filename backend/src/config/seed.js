const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const Mesa = require('../models/Mesa');
const Producto = require('../models/Producto');

const seedDatabase = async () => {
  try {
    // 1. Usuarios base por rol (contraseña para todos en pruebas: 123456)
    const usuariosCount = await Usuario.countDocuments();
    if (usuariosCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const passHash = await bcrypt.hash('123456', salt);

      await Usuario.insertMany([
        { nombre: 'Andre Mozo', email: 'mozo@kurokaze.pe', password: passHash, rol: 'Mozo' },
        { nombre: 'Claudia Cocina', email: 'cocina@kurokaze.pe', password: passHash, rol: 'Cocinero' },
        { nombre: 'Hannam Caja', email: 'caja@kurokaze.pe', password: passHash, rol: 'Cajero' },
        { nombre: 'Admin Kurokaze', email: 'admin@kurokaze.pe', password: passHash, rol: 'Admin' }
      ]);
      console.log('Seed: Usuarios base creados (pass: 123456)');
    }

    // 2. Mesas por piso (1er piso, 2do piso y barra)
    const mesasCount = await Mesa.countDocuments();
    if (mesasCount === 0) {
      const mesas = [];
      for (let i = 1; i <= 8; i++) {
        mesas.push({ codigo: `P1-${String(i).padStart(2, '0')}`, piso: 1, capacidad: 4 });
      }
      for (let i = 1; i <= 8; i++) {
        mesas.push({ codigo: `P2-${String(i).padStart(2, '0')}`, piso: 2, capacidad: 4 });
      }
      for (let i = 1; i <= 4; i++) {
        mesas.push({ codigo: `BAR-${String(i).padStart(2, '0')}`, piso: 3, capacidad: 2 });
      }
      await Mesa.insertMany(mesas);
      console.log('Seed: 20 mesas creadas (P1, P2 y BAR)');
    }

    // 3. Carta base Kurokaze (precios en PEN)
    const productosCount = await Producto.countDocuments();
    if (productosCount === 0) {
      await Producto.insertMany([
        { nombre: 'Gyozas de cerdo (6u)', precio: 18.0, categoria: 'Entrada' },
        { nombre: 'Edamame al sal de mar', precio: 14.0, categoria: 'Entrada' },
        { nombre: 'Tonkotsu Ramen', precio: 34.0, categoria: 'Ramen & Platos' },
        { nombre: 'Katsu Curry con arroz', precio: 30.0, categoria: 'Ramen & Platos' },
        { nombre: 'Acevichado Roll (8u)', precio: 28.0, categoria: 'Sushi & Rolls' },
        { nombre: 'Nigiri Salmón Flameado (4u)', precio: 24.0, categoria: 'Sushi & Rolls' },
        { nombre: 'Limonada de Yuzu', precio: 12.0, categoria: 'Bar & Bebidas' },
        { nombre: 'Matcha Latte Frío', precio: 13.5, categoria: 'Bar & Bebidas' },
        { nombre: 'Mochi de Helado', precio: 15.0, categoria: 'Postre' }
      ]);
      console.log('Seed: Carta Kurokaze cargada');
    }
  } catch (error) {
    console.error('Error ejecutando seed:', error.message);
  }
};

module.exports = seedDatabase;