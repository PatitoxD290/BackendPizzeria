// routes/precio_producto.routes.js
const express = require("express");
const router = express.Router();
const precioproductoController = require("../controllers/precio_producto.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/precioproductos", verifyToken, precioproductoController.getPreciosProducto);
router.get("/precioproductos/:id", verifyToken, precioproductoController.getPrecioProductoById);
router.post("/precioproductos", verifyToken, precioproductoController.createPrecioProducto);
router.put("/precioproductos/:id", verifyToken, precioproductoController.updatePrecioProducto);
router.delete("/precioproductos/:id", verifyToken, precioproductoController.deletePrecioProducto);

module.exports = router;
