const express = require("express");
const router = express.Router();
const { fetchActivityLogs } = require("../controller/activityLog");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, fetchActivityLogs);

module.exports = router;
