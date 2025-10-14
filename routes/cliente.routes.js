const express = require("express");
const router = express.Router();

const clienteController = require("../controllers/cliente.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/clientes", clienteController.getClientes);

router.put("/clientes/:id", verifyToken, clienteController.updateClientePuntos);

module.exports = router;
