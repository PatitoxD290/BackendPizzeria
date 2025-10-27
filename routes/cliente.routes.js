const express = require("express");
const router = express.Router();

const clienteController = require("../controllers/cliente.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/clientes", verifyToken, clienteController.getClientes);
router.get("/clientes/:id", verifyToken, clienteController.getClienteById);
router.post("/clientes", clienteController.createCliente);
router.put("/clientes/:id", verifyToken, clienteController.updateCliente);
router.delete("/clientes/:id", verifyToken, clienteController.deleteCliente);

module.exports = router;
