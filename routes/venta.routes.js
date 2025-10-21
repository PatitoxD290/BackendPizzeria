const express = require("express");
const router = express.Router();
const ventaController = require("../controllers/venta.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/ventas", verifyToken, ventaController.getVentas);
router.get("/ventas/boleta/:id", verifyToken, ventaController.datosBoletaVenta);
router.get("/ventas/:id", verifyToken, ventaController.getVentaById);
router.post("/ventas", verifyToken, ventaController.createVenta);

module.exports = router;
