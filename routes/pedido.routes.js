const express = require("express");
const router = express.Router();
const pedidoController = require("../controllers/pedido.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/pedidos", pedidoController.getPedidos);

router.get("/pedidos/:id", verifyToken, pedidoController.getPedidoById);
//  Obtener solo los detalles del pedido
router.get("/pedidos/:id/detalles", verifyToken, pedidoController.getPedidoDetalles);
router.post("/pedidos", pedidoController.createPedidoConDetalle);
router.put("/pedidos/:id", verifyToken, pedidoController.updatePedidoConDetalle);

router.get("/pedidos/:pedido_id/notas", verifyToken, pedidoController.getDetallesConNotas);

module.exports = router;
