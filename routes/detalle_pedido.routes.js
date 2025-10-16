// routes/detalle_pedido.routes.js
const express = require("express");
const router = express.Router();

const detallepedidoController = require("../controllers/detalle_pedido.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/detallepedidos", verifyToken, detallepedidoController.getDetallesPedido);
router.get("/detallepedidos/:id", verifyToken, detallepedidoController.getDetallePedidoById);
router.post("/detallepedidos", verifyToken, detallepedidoController.createDetallePedido);
router.put("/detallepedidos/:id", verifyToken, detallepedidoController.updateDetallePedido);
router.delete("/detallepedidos/:id", verifyToken, detallepedidoController.deleteDetallePedido);

module.exports = router;
  