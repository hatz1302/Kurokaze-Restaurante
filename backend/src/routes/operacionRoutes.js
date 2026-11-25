const { Router } = require('express');
const { verificarToken, permitirRol } = require('../middlewares/authMiddleware');
const {
  listarMesas,
  listarProductos,
  listarOrdenes,
  abrirOrden,
  actualizarItemsOrden,
  enviarACocina,
  cancelarOrden,
  marcarOrdenLista,
  procesarPago,
  pedirCuentaOrden,
  alternarDisponibilidadProducto
  
} = require('../controllers/operacionController');

const router = Router();

router.use(verificarToken);

// Consulta general para personal autenticado
router.get('/mesas', listarMesas);
router.get('/productos', listarProductos);
router.get('/ordenes', listarOrdenes);

// Mozo / Admin
router.post('/ordenes', permitirRol('Mozo', 'Admin'), abrirOrden);
router.put('/ordenes/:id/items', permitirRol('Mozo', 'Admin'), actualizarItemsOrden);
router.patch('/ordenes/:id/cocina', permitirRol('Mozo', 'Admin'), enviarACocina);
router.patch('/ordenes/:id/cancelar', permitirRol('Mozo', 'Admin'), cancelarOrden);
router.patch('/ordenes/:id/pedir-cuenta', permitirRol('Mozo', 'Admin'), pedirCuentaOrden);

// Cocinero / Admin
router.patch('/ordenes/:id/listo', permitirRol('Cocinero', 'Admin'), marcarOrdenLista);
router.patch('/productos/:id/disponibilidad', permitirRol('Cocinero', 'Admin'), alternarDisponibilidadProducto);


// Cajero / Admin
router.post('/ordenes/:id/pagar', permitirRol('Cajero', 'Admin'), procesarPago);

module.exports = router;