const express = require("express");
const router = express.Router();
const {
  createLeadLabel,
  fetchAllLeadLabels,
  fetchLeadLabelById,
  updateLeadLabel,
  deleteLeadLabel,
  updateLabelOrder,
} = require("../controller/leadLabel");
const authMiddleware = require("../middleware/auth");
const { authorize } = require("../middleware/permissions");

// Create new lead label
router.post(
  "/",
  authMiddleware,
  // authorize("setup", "create"),
  createLeadLabel
);

// Get all lead labels (with pagination and search)
router.get(
  "/",
  authMiddleware,
  // authorize("setup", "readAll"),
  fetchAllLeadLabels
);

// Get single lead label by ID
router.get(
  "/:id",
  authMiddleware,
  // authorize("setup", "readAll"),
  fetchLeadLabelById
);

// Update lead label
router.put(
  "/:id",
  authMiddleware,
  // authorize("setup", "update"),
  updateLeadLabel
);

// Delete lead label
router.delete(
  "/:id",
  authMiddleware,
  // authorize("setup", "delete"),
  deleteLeadLabel
);

// Bulk update label order
router.post(
  "/order/update",
  authMiddleware,
  // authorize("setup", "update"),
  updateLabelOrder
);

module.exports = router;