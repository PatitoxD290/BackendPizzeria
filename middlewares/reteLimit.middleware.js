const rateLimit = require('express-rate-limit');

// Middleware de rate limit
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos en milisegundos
  max: 30, // 30 peticiones por cada 5 minutos
  message: 'Demasiadas solicitudes desde esta IP, por favor intente de nuevo más tarde.',
  headers: true, // Añade información sobre el rate limit en las cabeceras de la respuesta
});

module.exports = limiter;
