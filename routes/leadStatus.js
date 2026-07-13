var express = require("express");
var router = express.Router();
let {
  createLeadStatus,
  fetchAllLeadStatus,
  fetchLeadStatusById,
  LeadStatusUpdate,
  LeadStatusDelete,
} = require("../controller/leadStatus");
let authMiddleware = require("../middleware/auth");
const { authorize } = require("../middleware/permissions");

router.post(
  "/",
  authMiddleware,
  authorize("leadStatus", "create"),
  createLeadStatus,
);
router.get(
  "/",
  authMiddleware,
  authorize("leadStatus", "readAll"),
  fetchAllLeadStatus,
);
router.get(
  "/:id",
  authMiddleware,
  authorize("leadStatus", "readAll"),
  fetchLeadStatusById,
);
router.put(
  "/:id",
  authMiddleware,
  authorize("leadStatus", "update"),
  LeadStatusUpdate,
);
router.delete(
  "/:id",
  authMiddleware,
  authorize("leadStatus", "delete"),
  LeadStatusDelete,
);

module.exports = router;
