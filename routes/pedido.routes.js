const express = require("express");
const router = express.Router();
const pedidoController = require("../controllers/pedido.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/pedidos", pedidoController.getPedidos);
router.get("/pedidos/:pedido_id", verifyToken, pedidoController.getDetallesConNotas);
router.post("/pedidos", pedidoController.createPedidoConDetalle);
router.put("/pedidos/:id", verifyToken, pedidoController.updatePedidoConDetalle);

module.exports = router;
