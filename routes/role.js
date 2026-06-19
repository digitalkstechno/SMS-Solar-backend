var express = require("express");
var router = express.Router();
let {
  createRole,
  fetchAllRoles,
  fetchRoleById,
  roleUpdate,
  roleDelete
} = require("../controller/role");
let authMiddleware = require("../middleware/auth");
const { authorize } = require("../middleware/permissions");

router.post("/", authMiddleware, 
  // authorize("setup", "create"), 
  createRole);
router.get("/", authMiddleware, 
  // authorize("setup", "readAll"), 
  fetchAllRoles);
router.get(
  "/:id",
  authMiddleware,
  // authorize("setup", "readAll"),
  fetchRoleById,
);
router.put("/:id", authMiddleware, 
  // authorize("setup", "update"), 
  roleUpdate);
router.delete(
  "/:id",
  authMiddleware,
  // authorize("setup", "delete"),
  roleDelete,
);

module.exports = router;
