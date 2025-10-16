// routes/venta.routes.js
const express = require("express");
const router = express.Router();
const ventaController = require("../controllers/venta.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/ventas", verifyToken, ventaController.getVentas);
router.get("/ventas/:id", verifyToken, ventaController.getVentaById);
router.post("/ventas", verifyToken, ventaController.createVenta);
router.put("/ventas/:id", verifyToken, ventaController.updateVenta);
router.delete("/ventas/:id", verifyToken, ventaController.deleteVenta);
router.get("/ventas/boleta/:id", verifyToken, ventaController.datosBoletaVenta);

module.exports = router;
