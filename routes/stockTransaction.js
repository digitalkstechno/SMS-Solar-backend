const express = require("express");
const router = express.Router();
const stockTransactionController = require("../controller/stockTransaction");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware, stockTransactionController.createTransaction);
router.get("/", authMiddleware, stockTransactionController.getAllTransactions);
router.patch("/:id", authMiddleware, stockTransactionController.updateTransaction);
router.delete("/:id", authMiddleware, stockTransactionController.deleteTransaction);

module.exports = router;
