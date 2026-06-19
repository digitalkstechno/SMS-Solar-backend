const express = require("express");
const router = express.Router();
const metaController = require("../controller/metaLead");

// Webhook verification (GET)
router.get("/webhook", metaController.verifyWebhook);

// Webhook events (POST)
router.post("/webhook", metaController.handleWebhook);

module.exports = router;
