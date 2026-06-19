const express = require("express");
const RC = require("../controller/notification");
const authMiddleware = require("../middleware/auth");
// const { protect } = require("../controller/auth");

const router = express.Router();

router.get("/my-notifications", authMiddleware, RC.getMyNotifications);
router.put("/mark-all-read", authMiddleware, RC.markAllAsRead);
router.put("/mark-read/:id", authMiddleware, RC.markAsRead);

module.exports = router;
