const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { authorize, leadReadScope } = require("../middleware/permissions");
const { getKwGrowth, getSalesWinRate, getLeadsBySource } = require("../controller/analytics");

// Added leadReadScope to respect user's visibility of leads for charts
router.get("/kw-growth", authMiddleware, leadReadScope(), getKwGrowth);
router.get("/sales-win-rate", authMiddleware, leadReadScope(), getSalesWinRate);
router.get("/leads-by-source", authMiddleware, leadReadScope(), getLeadsBySource);

module.exports = router;
