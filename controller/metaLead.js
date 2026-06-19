const axios = require("axios");
const LEAD = require("../model/lead");
const LeadStatus = require("../model/leadStatus");
const LeadSource = require("../model/leadSources");
const Staff = require("../model/staff");
const { incrementCount } = require("../utils/leadCountHelper");

/**
 * Handles the initial verification from Meta (Facebook)
 */
exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.META_VERIFY_TOKEN || "my_secure_verify_token";

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
};

/**
 * Receives the actual lead notification from Meta
 */
exports.handleWebhook = async (req, res) => {
  const body = req.body;

  // Meta sends 'object': 'page' for leadgen events
  if (body.object === "page") {
    for (const entry of body.entry) {
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === "leadgen") {
            const leadId = change.value.leadgen_id;
            // We don't await here to respond fast to Meta, or we can await if we want to ensure processing
            // Facebook expects a 200 response quickly
            processLead(leadId).catch(err => console.error("Async Process Error:", err));
          }
        }
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
};

/**
 * Fetches lead details from Meta Graph API and saves to CRM
 */
async function processLead(leadId) {
  try {
    const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
    if (!accessToken) {
        throw new Error("META_PAGE_ACCESS_TOKEN is not configured in .env");
    }

    // Fetch lead details using the lead ID
    const response = await axios.get(
      `https://graph.facebook.com/v20.0/${leadId}?access_token=${accessToken}`
    );

    const metaLead = response.data;
    const fieldData = {};
    
    // Meta lead data comes as an array of field objects: [{name: 'email', values: ['...']}, ...]
    if (metaLead.field_data) {
        metaLead.field_data.forEach((field) => {
            fieldData[field.name] = field.values ? field.values[0] : null;
        });
    }

    // 1. Get default Lead Status (Look for 'Pending' or 'New', or first available)
    let status = await LeadStatus.findOne({ name: { $regex: /Pending|New/i } });
    if (!status) status = await LeadStatus.findOne().sort({ order: 1 });

    // 2. Get default Lead Source (Look for 'Meta' or 'Facebook', or create one)
    let source = await LeadSource.findOne({ name: { $regex: /Meta|Facebook/i } });
    if (!source) {
        // If not found, let's try to find any first available or use a fallback
        source = await LeadSource.findOne().sort({ order: 1 });
    }

    // 3. Get default Staff to assign (Assign to first available admin or staff)
    let staff = await Staff.findOne({ status: "active" });

    if (!status || !source || !staff) {
        console.error("Missing required Lead metadata (Status, Source, or Staff). Please ensure they exist in DB.");
        return;
    }

    // Construct the CRM lead object
    // Mapping Meta standard fields to CRM model fields
    const newLeadData = {
      fullName: fieldData.full_name || fieldData.first_name + (fieldData.last_name ? " " + fieldData.last_name : "") || "Meta Lead",
      contact: fieldData.phone_number || "9999999999",
      email: fieldData.email || `lead_${leadId}@meta.com`,
      companyName: fieldData.company_name || "Meta App",
      address: fieldData.city || fieldData.street_address || "Facebook/Instagram",
      leadStatus: status._id,
      leadSource: source._id,
      assignedTo: staff._id,
      note: `Meta Lead ID: ${leadId}\nForm Name: ${metaLead.form_id || 'Unknown'}`,
      priority: "medium",
      isActive: true
    };

    // Save to Database
    const savedLead = await LEAD.create(newLeadData);
    
    // Increment source/status counts using existing helper
    await incrementCount({
      statusId: savedLead.leadStatus,
      sourceId: savedLead.leadSource,
    });

  } catch (error) {
    console.error("Error processing Meta lead detail:", error.response ? error.response.data : error.message);
  }
}
