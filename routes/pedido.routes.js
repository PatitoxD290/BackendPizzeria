// routes/pedido.routes.js
const express = require("express");
const router = express.Router();
const pedidoController = require("../controllers/pedido.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/pedidos", verifyToken, pedidoController.getPedidos);
router.get("/pedidos/:id", verifyToken, pedidoController.getPedidoById);
router.post("/pedidos", verifyToken, pedidoController.createPedido);
router.put("/pedidos/:id", verifyToken, pedidoController.updatePedido);
router.delete("/pedidos/:id", verifyToken, pedidoController.deletePedido);

module.exports = router;
