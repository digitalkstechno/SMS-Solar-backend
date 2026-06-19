const express = require("express");
const router = express.Router();
const metaController = require("../controller/meta");

/**
 * Routes for Meta Developer Console Integration
 * Base URL: /v1/api/meta
 */

// Webhook Verification (Required by Meta)
router.get("/webhook", metaController.verifyWebhook);

// Webhook Event Handler (Where Meta sends lead data)
router.post("/webhook", metaController.handleWebhook);

// Ping Test (To verify route accessibility)
router.get("/ping", metaController.pingTest);

// Sheet Lead Handler (Direct JSON posting)
router.post("/sheet-lead", metaController.handleSheetLead);

router.post("/wp-lead", metaController.createWhatsappLead);





module.exports = router;
