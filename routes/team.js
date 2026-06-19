var express = require("express");
var router = express.Router();
const { createTeam, fetchAllTeams, updateTeam, deleteTeam } = require("../controller/team");
const authMiddleware = require("../middleware/auth");
const { authorize } = require("../middleware/permissions");

router.post("/", authMiddleware, authorize("setup", "create"), createTeam);
router.get("/", authMiddleware, authorize("setup", "readAll"), fetchAllTeams);
router.put("/:id", authMiddleware, authorize("setup", "update"), updateTeam);
router.delete("/:id", authMiddleware, authorize("setup", "delete"), deleteTeam);

module.exports = router;
