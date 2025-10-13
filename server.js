require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('./middlewares/reteLimit.middleware'); 
const authRoutes = require("./routes/auth.routes");
const clienteRoutes = require("./routes/cliente.routes");

// IMPORT: conexión MSSQL
const { getConnection } = require('./config/Connection');

const app = express();

// Seguridad
app.use(helmet());

// CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Validación de variables
const requiredEnvVars = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`Error: La variable de entorno ${envVar} no está definida`);
    process.exit(1);
  }
});

app.use(express.json());

// Aplicar el rate limit globalmente a todas las rutas de la API
app.use("/api/v2", rateLimit);

// Ruta base
app.get("/", (_req, res) => {
  res.json({ message: "BACKEND AITA! PIZZA", version: "1.0.0" });
});

// Rutas API
app.use("/api/v2", authRoutes);
app.use("/api/v2", clienteRoutes);

// Rutas estáticas para imágenes
app.use('/imagenesCata', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); 
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Ruta 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Puerto
const PORT = process.env.PORT || 3001;

// Intentamos conectar a la base de datos y mostramos resultado en consola.
// No se detiene el servidor si falla la conexión; solo registramos el estado.
(async () => {
  try {
    // intenta conectar (tu Connection.js ya imprime más info)
    await getConnection();
    console.log(`[SERVER] Conexión a la base de datos establecida ✅`);
    app.locals.dbConnected = true;
  } catch (err) {
    console.error(`[SERVER] No se pudo conectar a la base de datos ❌`);
    console.error(err && err.message ? err.message : err);
    app.locals.dbConnected = false;
  } finally {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT} 🥵🔥`);
      console.log(`[SERVER] Estado DB -> connected: ${Boolean(app.locals.dbConnected)}`);
    });
  }
})();
