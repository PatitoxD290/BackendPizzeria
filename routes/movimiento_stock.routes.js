// routes/movimiento_stock.routes.js
const express = require("express");
const router = express.Router();

const movimientostockController = require("../controllers/moviento_stock.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/movimientostock", verifyToken, movimientostockController.getMovimientosStock);
router.get("/movimientostock/:id", verifyToken, movimientostockController.getMovimientoStockById);
router.post("/movimientostock", verifyToken, movimientostockController.createMovimientoStock);
router.put("/movimientostock/:id", verifyToken, movimientostockController.updateMovimientoStock);
router.delete("/movimientostock/:id", verifyToken, movimientostockController.deleteMovimientoStock);

module.exports = router;
  