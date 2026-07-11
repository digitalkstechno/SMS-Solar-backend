var express = require("express");
var router = express.Router();
const multer = require("multer");
const createUploader = require("../utils/multer");
const upload = createUploader("images/LeadAttachment");
const paymentUpload = createUploader("images/PaymentProof");
// Temp storage for bulk import files (memory or temp disk)
const importUpload = multer({ dest: require("os").tmpdir() });
let {
  createLead,
  fetchAllLeads,
  fetchMyLeads,
  fetchLeadById,
  leadUpdate,
  leadDelete,
  fetchLeadsForKanban,
  fetchKanbanLeadsByStatus,
  updateKanbanStatus,
  getKanbanCounts,
  getLeadCountSummary,
  getMyLeadSummary,
  getUpcomingFollowups,
  getMyUpcomingFollowups,
  getDueFollowups,
  getMyDueFollowups,
  getWonLeads,
  getLostLeads,
  deleteAttachment,
  exportLeadsToExcel,
  downloadImportTemplate,
  bulkImportLeads,
  addPayment,
  getPayments,
  deleteQuotation,
  getQuotation,
  getDashboardStats,
  assignStock
} = require("../controller/lead");
const authMiddleware = require("../middleware/auth");
const { authorize, leadReadScope } = require("../middleware/permissions");

router.post("/:id/assign-stock", authMiddleware, authorize("lead", "update"), assignStock);
router.post("/create", authMiddleware, authorize("lead", "create"), upload.array("attachments"), createLead);
router.get("/my", authMiddleware, fetchMyLeads);
router.get("/count-summary/my", authMiddleware, getMyLeadSummary);
router.get("/dashboard-stats", authMiddleware, leadReadScope(), getDashboardStats);
router.get("/", authMiddleware, leadReadScope(), fetchAllLeads);
router.get("/kanban", authMiddleware, leadReadScope(), fetchLeadsForKanban);
router.get("/kanban-status", authMiddleware, leadReadScope(), fetchKanbanLeadsByStatus);
router.get(
  "/kanban-counts",
  authMiddleware,
  leadReadScope(),
  getKanbanCounts,
);
router.get(
  "/count-summary",
  authMiddleware,
  leadReadScope(),
  getLeadCountSummary,
);
router.get(
  "/followups/upcoming",
  authMiddleware,
  leadReadScope(),
  getUpcomingFollowups,
);
router.get(
  "/followups/upcoming/my",
  authMiddleware,
  getMyUpcomingFollowups,
);
router.get(
  "/followups/due",
  authMiddleware,
  leadReadScope(),
  getDueFollowups,
);
router.get(
  "/followups/due/my",
  authMiddleware,
  getMyDueFollowups,
);
router.get("/won", authMiddleware, leadReadScope(), getWonLeads);
router.get("/lost", authMiddleware, leadReadScope(), getLostLeads);
router.get("/export", authMiddleware, leadReadScope(), exportLeadsToExcel);
router.get("/import-template", authMiddleware, authorize("lead", "create"), downloadImportTemplate);
router.post("/bulk-import", authMiddleware, authorize("lead", "create"), importUpload.single("file"), bulkImportLeads);
router.get("/:id", authMiddleware, leadReadScope(), fetchLeadById);
router.put(
  "/:id/kanban-status",
  authMiddleware,
  authorize("lead", "update"),
  updateKanbanStatus,
);
router.put(
  "/:id",
  authMiddleware,
  authorize("lead", "update"),
  upload.array("attachments"),
  leadUpdate,
);
router.delete(
  "/:id",
  authMiddleware,
  authorize("lead", "delete"),
  leadDelete,
);
router.delete('/:leadId/attachments/:attachmentId', authMiddleware, authorize("lead", "delete"), deleteAttachment);

//   routes
router.delete('/:leadId/quotation/:quotationId', authMiddleware, authorize("lead", "delete"), deleteQuotation);
router.get('/:leadId/quotation/:quotationId', authMiddleware, leadReadScope(), getQuotation);

// Payment routes
router.get('/:leadId/payments', authMiddleware, leadReadScope(), getPayments);
router.post('/:leadId/payments', authMiddleware, authorize("lead", "update"), paymentUpload.single("proof"), addPayment);

module.exports = router;
