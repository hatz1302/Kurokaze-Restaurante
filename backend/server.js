require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');


const authRoutes = require('./src/routes/authRoutes');
const seedDatabase = require('./src/config/seed');
const operacionRoutes = require('./src/routes/operacionRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.set('io', io);

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api', operacionRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB conectado — Kurokaze');
    await seedDatabase();
  })
  .catch((err) => console.error('Error conectando a MongoDB:', err.message));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, proyecto: 'Kurokaze Restaurante-Bar' });
});

io.on('connection', (socket) => {
  console.log('Cliente conectado a Socket.IO:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Servidor Kurokaze corriendo en http://localhost:${PORT}`);
});