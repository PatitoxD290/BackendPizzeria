const express = require("express");
const router = express.Router();
const combosController = require("../controllers/combos.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/combos", combosController.getCombos);
router.get("/combos/:id", verifyToken, combosController.getComboById);
router.post("/combos", verifyToken, combosController.createComboConDetalle);
router.put("/combos/:id", verifyToken, combosController.updateCombo);
router.delete("/combos/:id", verifyToken, combosController.deleteCombo);

module.exports = router;
