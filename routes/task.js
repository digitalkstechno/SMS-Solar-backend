const express = require("express");
const router = express.Router();
const createUploader = require("../utils/multer");
const upload = createUploader("images/TaskAttachments");
const authMiddleware = require("../middleware/auth");
const { createTask, getAllTasks, getTaskById, updateTask, deleteTask, getMyTasks, updateTaskStatus, updateTaskPriority, getTaskSummary, getMyTaskSummary, deleteAttachment, getTasksForKanban, getTodayTasks, fetchKanbanTasksByStatus } = require("../controller/task");

router.post("/create", authMiddleware, upload.array("attachments", 10), createTask);
router.get("/my", authMiddleware, getMyTasks);
router.get("/today", authMiddleware, getTodayTasks);
router.get("/summary", authMiddleware, getTaskSummary);
router.get("/my-summary", authMiddleware, getMyTaskSummary);
router.get("/kanban-status", authMiddleware, fetchKanbanTasksByStatus);
router.get("/kanban", authMiddleware, getTasksForKanban);
router.get("/", authMiddleware, getAllTasks);
router.get("/:id", authMiddleware, getTaskById);
router.patch("/:id/status", authMiddleware, updateTaskStatus);
router.patch("/:id/priority", authMiddleware, updateTaskPriority);
router.put("/:id", authMiddleware, upload.array("attachments", 10), updateTask);
router.delete("/:id/attachments/:attachmentId", authMiddleware, deleteAttachment);
router.delete("/:id", authMiddleware, deleteTask);

module.exports = router;
