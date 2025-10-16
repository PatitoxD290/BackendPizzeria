// routes/ingrediente.routes.js
const express = require("express");
const router = express.Router();

const ingredienteController = require("../controllers/ingrediente.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/ingredientes", verifyToken, ingredienteController.getIngredientes);
router.get("/ingredientes/:id", verifyToken, ingredienteController.getIngredienteById);
router.post("/ingredientes", verifyToken, ingredienteController.createIngrediente);
router.put("/ingredientes/:id", verifyToken, ingredienteController.updateIngrediente);
router.delete("/ingredientes/:id", verifyToken, ingredienteController.deleteIngrediente);

module.exports = router;
  