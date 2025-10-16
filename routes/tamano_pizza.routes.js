// routes/tamano_pizza.routes.js
const express = require("express");
const router = express.Router();
const tamanopizzaController = require("../controllers/tamano_pizza.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/tamanopizza", verifyToken, tamanopizzaController.getTamanosPizza);
router.get("/tamanopizza/:id", verifyToken, tamanopizzaController.getTamanoPizzaById);
router.post("/tamanopizza", verifyToken, tamanopizzaController.createTamanoPizza);
router.put("/tamanopizza/:id", verifyToken, tamanopizzaController.updateTamanoPizza);
router.delete("/tamanopizza/:id", verifyToken, tamanopizzaController.deleteTamanoPizza);

module.exports = router;
