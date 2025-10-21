// routes/usuario.routes.js
const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuario.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/", verifyToken, usuarioController.getUsuarios);
router.get("/:id", verifyToken, usuarioController.getUsuarioById);
router.post("/", usuarioController.createUsuario);
router.put("/:id", verifyToken, usuarioController.updateUsuario);
router.delete("/:id", verifyToken, usuarioController.deleteUsuario);
router.put("/:id/password", verifyToken, usuarioController.changePassword);

module.exports = router;
