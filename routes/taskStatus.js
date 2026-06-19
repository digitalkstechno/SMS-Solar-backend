var express = require("express");
var router = express.Router();
let {
    createTaskStatus,
    fetchAllTaskStatus,
    fetchTaskStatusById,
    TaskStatusUpdate,
    TaskStatusDelete,
} = require("../controller/taskStatus");
let authMiddleware = require("../middleware/auth");
const { authorize } = require("../middleware/permissions");

router.post(
    "/",
    authMiddleware,
    // authorize("setup", "create"),
    createTaskStatus
);
router.get(
    "/",
    authMiddleware,
    // authorize("setup", "readAll"),
    fetchAllTaskStatus
);
router.get(
    "/:id",
    authMiddleware,
    // authorize("setup", "readAll"),
    fetchTaskStatusById
);
router.put(
    "/:id",
    authMiddleware,
    // authorize("setup", "update"),
    TaskStatusUpdate
);
router.delete(
    "/:id",
    authMiddleware,
    // authorize("setup", "delete"),
    TaskStatusDelete
);

module.exports = router;
