const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
  try {
    // Obtener encabezado Authorization
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({ error: "Acceso denegado: No se proporcionó token" });
    }

    // Verificar formato Bearer
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ error: "Formato de token inválido. Use 'Bearer <token>'" });
    }

    // Extraer el token
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token no encontrado" });
    }

    // Verificar el token con la clave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 👇 Verificar que el token corresponda a la sesión actual del servidor
    if (decoded.server_key !== global.SERVER_SESSION_KEY) {
      return res.status(401).json({
        error: "Token inválido. El servidor ha reiniciado, por favor inicie sesión nuevamente."
      });
    }

    // Guardar los datos del usuario verificado en la request
    req.user = decoded;
    // Continuar hacia el siguiente middleware o controlador
    next();
  } catch (error) {
    // Captura errores específicos de expiración o formato
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado. Inicie sesión nuevamente." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido." });
    }

    // Otros errores
    return res.status(500).json({ error: "Error al verificar el token", message: error.message });
  }
};
