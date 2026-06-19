var express = require("express");
var router = express.Router();
let {
  createLeadSources,
  fetchAllLeadSources,
  fetchLeadSourcesById,
  LeadSourceUpdate,
  LeadSourcesDelete,
} = require("../controller/leadSources");
let authMiddleware = require("../middleware/auth");
const { authorize } = require("../middleware/permissions");

router.post(
  "/",
  authMiddleware,
  // authorize("setup", "create"),
  createLeadSources,
);
router.get(
  "/",
  authMiddleware,
  // authorize("setup", "readAll"),
  fetchAllLeadSources,
);
router.get(
  "/:id",
  authMiddleware,
  // authorize("setup", "readAll"),
  fetchLeadSourcesById,
);
router.put(
  "/:id",
  authMiddleware,
  // authorize("setup", "update"),
  LeadSourceUpdate,
);
router.delete(
  "/:id",
  authMiddleware,
  // authorize("setup", "delete"),
  LeadSourcesDelete,
);

module.exports = router;
