// routes/usuario.routes.js
const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuario.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/usuarios", verifyToken, usuarioController.getUsuarios);
router.get("/usuarios/:id", verifyToken, usuarioController.getUsuarioById);
router.post("/usuarios", verifyToken, usuarioController.createUsuario);
router.put("/usuarios/:id", verifyToken, usuarioController.updateUsuario);
router.delete("/usuarios/:id", verifyToken, usuarioController.deleteUsuario);
router.put("/usuarios/:id/password", verifyToken, usuarioController.changePassword);

module.exports = router;
