var express = require("express");
var router = express.Router();
const { createOrganization, fetchAllOrganizations, updateOrganization, deleteOrganization } = require("../controller/organization");
const authMiddleware = require("../middleware/auth");
const { authorize } = require("../middleware/permissions");

router.post("/", authMiddleware, authorize("setup", "create"), createOrganization);
router.get("/", authMiddleware, authorize("setup", "readAll"), fetchAllOrganizations);
router.put("/:id", authMiddleware, authorize("setup", "update"), updateOrganization);
router.delete("/:id", authMiddleware, authorize("setup", "delete"), deleteOrganization);

module.exports = router;
