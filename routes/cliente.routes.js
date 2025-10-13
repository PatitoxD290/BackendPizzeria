const express = require("express");
const router = express.Router();

const clienteController = require("../controllers/cliente.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

// Crear o actualizar cliente vinculado al usuario
router.post("/clientes", verifyToken, clienteController.createOrUpdateCliente);

// Obtener todos los clientes
router.get("/clientes", clienteController.getClientes);

// Actualizar cliente directamente por ID (admin u otro caso)
router.put("/clientes/:id", verifyToken, clienteController.updateCliente);

// Contratos
router.get("/contratos", clienteController.listarTodosContratos);

// Datos de boleta del cliente
router.get("/clientes-boleta/:id", clienteController.datosBoletaCliente);

module.exports = router;
