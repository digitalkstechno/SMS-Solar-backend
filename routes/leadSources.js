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
  authorize("leadSource", "create"),
  createLeadSources,
);
router.get(
  "/",
  authMiddleware,
  authorize("leadSource", "readAll"),
  fetchAllLeadSources,
);
router.get(
  "/:id",
  authMiddleware,
  authorize("leadSource", "readAll"),
  fetchLeadSourcesById,
);
router.put(
  "/:id",
  authMiddleware,
  authorize("leadSource", "update"),
  LeadSourceUpdate,
);
router.delete(
  "/:id",
  authMiddleware,
  authorize("leadSource", "delete"),
  LeadSourcesDelete,
);

module.exports = router;
