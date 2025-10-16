// routes/detalle_receta.routes.js
const express = require("express");
const router = express.Router();

const detallerecetaController = require("../controllers/detalle_receta.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/detallerecetas", verifyToken, detallerecetaController.getDetallesRecetas);
router.get("/detallerecetas/:id", verifyToken, detallerecetaController.getDetalleRecetaById);
router.post("/detallerecetas", verifyToken, detallerecetaController.createDetalleReceta);
router.put("/detallerecetas/:id", verifyToken, detallerecetaController.updateDetalleReceta);
router.delete("/detallerecetas/:id", verifyToken, detallerecetaController.deleteDetalleReceta);

module.exports = router;
  