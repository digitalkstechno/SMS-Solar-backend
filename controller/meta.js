const axios = require("axios");
const Lead = require("../model/lead");
const LeadStatus = require("../model/leadStatus");
const LeadSource = require("../model/leadSources");
const Staff = require("../model/staff");
const LeadLabel = require("../model/leadLabel");
const { incrementCount } = require("../utils/leadCountHelper");

/**
 * Maps Meta lead field data to our AccountMaster schema
 * Matches the fields used in /public-form
 */
const mapMetaFields = (fields) => {
  const mappedData = {
    address: {}
  };

  fields.forEach(field => {
    const name = field.name.toLowerCase();
    const value = field.values[0];

    // Mapping based on common Meta Lead Form field IDs
    if (name.includes("company")) {
      mappedData.companyName = value;
    } else if (name.includes("full_name") || name === "name") {
      mappedData.clientName = value;
    } else if (name.includes("phone") || name === "mobile") {
      // Ensure it has 91 prefix and is 12 digits for backend validation
      let phone = value.replace(/\D/g, "");
      if (phone.length === 10) {
        phone = "91" + phone;
      }
      mappedData.mobile = phone;
    } else if (name === "email") {
      mappedData.email = value;
    } else if (name === "website") {
      mappedData.website = value;
    } else if (name.includes("address")) {
      mappedData.address.line1 = value;
    } else if (name === "city") {
      mappedData.address.cityName = value;
    } else if (name === "state") {
      mappedData.address.stateName = value;
    } else if (name === "country") {
      mappedData.address.countryName = value;
    }
  });

  // Fallback if company name wasn't provided (since it's required in our schema)
  if (!mappedData.companyName) {
    mappedData.companyName = mappedData.clientName || "Facebook Lead";
  }

  return mappedData;
};

// GET /v1/api/meta/webhook - Verification for Meta
exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
      console.log("META_WEBHOOK_VERIFIED ✅");
      return res.status(200).send(challenge);
    } else {
      console.log("META_WEBHOOK_VERIFICATION_FAILED ❌");
      return res.sendStatus(403);
    }
  }
};

// POST /v1/api/meta/webhook - Handling lead notifications
exports.handleWebhook = async (req, res) => {
  console.log("WEBHOOK BODY:", JSON.stringify(req.body, null, 2));
  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      for (const change of entry.changes) {

        if (change.field === "leadgen") {

          const leadId = change.value.leadgen_id;
          console.log("Received New Facebook Lead ID:", leadId);

          try {

            const response = await axios.get(
              `https://graph.facebook.com/v25.0/${leadId}`,
              {
                params: {
                  access_token: process.env.META_ACCESS_TOKEN
                }
              }
            );

            const metaLead = response.data;

            console.log("Meta Lead Data:", metaLead);

            const accountData = mapMetaFields(metaLead.field_data || []);

            // Add extra meta fields
            accountData.metaLeadId = leadId;
            accountData.source = "facebook";
            accountData.metaRawData = metaLead; // store full response for debugging

            // Temporary fallback values
            if (!accountData.mobile) {
              accountData.mobile = "TEMP_" + Date.now();
            }

            if (!accountData.clientName) {
              accountData.clientName = "Facebook Lead";
            }

            if (!accountData.companyName) {
              accountData.companyName = "Facebook Lead";
            }

            // Avoid duplicate using leadId
            const existingLead = await Lead.findOne({
              metaLeadId: leadId
            });

            if (!existingLead) {

              const newAccount = await Lead.create(accountData);

              console.log("✅ Meta Lead Saved:", newAccount._id);

            } else {

              console.log("⚠️ Lead already exists:", leadId);

            }

          } catch (error) {

            console.error(
              "❌ Error fetching lead:",
              error.response ? error.response.data : error.message
            );

          }

        }

      }
    }

    return res.status(200).send("EVENT_RECEIVED");
  }

  res.sendStatus(404);
};

// GET /v1/api/meta/ping - Simple test to check if the route is reachable
exports.pingTest = (req, res) => {
  res.status(200).json({
    status: "Success",
    message: "Meta integration route is working correctly!",
    env_check: {
      verify_token_set: !!process.env.META_VERIFY_TOKEN,
      access_token_set: !!process.env.META_ACCESS_TOKEN
    }
  });
};

// POST /v1/api/meta/sheet-lead
exports.handleSheetLead = async (req, res) => {
  try {
    const data = req.body;
    console.log("Sheet Lead Data received:", data);

    // 1. Get Lead Status
    // Try to match lead_status from sheet, fallback to "New Lead" or first status
    let status;
    const sheetStatus = data.lead_status || data.status;
    if (sheetStatus) {
      status = await LeadStatus.findOne({ name: { $regex: new RegExp(`^${sheetStatus}$`, 'i') } });
    }
    if (!status) status = await LeadStatus.findOne({ name: { $regex: /New Lead|New|Pending/i } });
    if (!status) status = await LeadStatus.findOne().sort({ order: 1 });

    // 2. Get Lead Source
    // Use platform from sheet, map ig/fb to full names, and create if doesn't exist
    let platform = data.platform || "";
    if (platform.toLowerCase() === "ig") platform = "Instagram";
    else if (platform.toLowerCase() === "fb") platform = "Facebook";

    let source;
    if (platform) {
      source = await LeadSource.findOne({ name: { $regex: new RegExp(`^${platform}$`, 'i') } });
      
      // If platform is provided but not found in DB, create it automatically
      if (!source) {
        const lastSource = await LeadSource.findOne().sort({ order: -1 });
        const nextOrder = lastSource ? (lastSource.order || 0) + 1 : 1;
        source = await LeadSource.create({ 
          name: platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase(), 
          order: nextOrder 
        });
        console.log(`Created new Lead Source: ${source.name}`);
      }
    }

    // Fallback if no platform was provided or found/created
    if (!source) source = await LeadSource.findOne({ name: { $regex: /Meta|Facebook|Instagram|Sheet/i } });
    if (!source) source = await LeadSource.findOne().sort({ order: 1 });

    // 3. Get default Staff to assign
    let staff = await Staff.findOne({ status: "active" });

    if (!status || !source || !staff) {
      console.error("❌ [SHEET-LEAD] Missing metadata (Status, Source, or Staff) in DB.");
      return res.status(400).json({
        error: "Missing required Lead metadata (Status, Source, or Staff in DB)"
      });
    }

    const leadId = data.id || data.metaLeadId || ("SL_" + Date.now());

    // Map phone, removing any non-numeric chars (handles "p:9328268532")
    let contact = (data.phone || data.phone_number || data.mobile || data.contact || "0000000000").toString().replace(/\D/g, "");
    if (contact.length === 10) contact = "91" + contact;

    // Build Note from custom fields
    let noteParts = [];
    if (data.note) noteParts.push(data.note);
    if (data["are_you_an_exporter?"]) noteParts.push(`Exporter: ${data["are_you_an_exporter?"]}`);
    if (data["looking_for_government_benefits?_"]) noteParts.push(`Gov Benefits: ${data["looking_for_government_benefits?_"]}`);
    if (data.form_name) noteParts.push(`Form: ${data.form_name}`);
    if (data.campaign_name) noteParts.push(`Campaign: ${data.campaign_name}`);
    
    const accountData = {
      fullName: data.full_name || data.fullName || data.clientName || data.name || "Sheet Lead",
      contact: contact,
      email: data.email || "",
      companyName: data.company_name || data.companyName || data.form_name || data.campaign_name || "Sheet/Meta Lead",
      address: data.city || data.address || "Sheet Entry",
      leadStatus: status._id,
      leadSource: source._id,
      assignedTo: staff._id,
      metaLeadId: leadId,
      metaRawData: data,
      priority: data.priority || "medium",
      isActive: true,
      note: noteParts.join(" | ") || `Imported from Sheet at ${new Date().toISOString()}`
    };

    console.log("Creating lead with data:", accountData);

    // duplicate check by metaLeadId
    const existingLead = await Lead.findOne({
      metaLeadId: leadId
    });

    if (!existingLead) {
      const newLead = await Lead.create(accountData);

      // Increment source/status counts
      await incrementCount({
        statusId: newLead.leadStatus,
        sourceId: newLead.leadSource,
      });

      console.log("✅ Sheet Lead Saved:", newLead._id);
      return res.json({
        success: true,
        leadId: newLead._id
      });
    } else {
      console.log("⚠️ Lead already exists:", leadId);
      return res.json({
        success: true,
        message: "Lead already exists"
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: err.message
    });
  }
};
// POST /v1/api/meta/whatsapp-lead
exports.createWhatsappLead = async (req, res) => {
  try {
    console.log(req.body);
    
    const { fullName, contact, companyName, notes } = req.body;
 
    if (!fullName || !contact || !companyName) {
      return res.status(400).json({
        status: "Fail",
        message: "fullName, contact, and companyName are required",
      });
    }

    // 1. LeadStatus: "New Lead" find karo
    const leadStatus = await LeadStatus.findOne({
      name: { $regex: /^new lead$/i },
    });

    if (!leadStatus) {
      return res.status(400).json({
        status: "Fail",
        message: "Lead status 'New Lead' not found. Please create it first.",
      });
    }

    // 2. LeadSource: "WhatsApp" find karo, na ho to create karo
    let leadSource = await LeadSource.findOne({
      name: { $regex: /^whatsapp$/i },
    });

    if (!leadSource) {
      const lastSource = await LeadSource.findOne().sort({ order: -1 });
      const nextOrder = lastSource ? (lastSource.order || 0) + 1 : 1;
      leadSource = await LeadSource.create({ name: "WhatsApp", order: nextOrder });
    }

    // 3. Duplicate check by contact
    const existing = await Lead.findOne({ contact });
    if (existing) {
      return res.status(200).json({
        status: "Success",
        message: "Lead already exists",
        data: existing,
      });
    }

    // 4. Lead create karo
    const lead = await Lead.create({
      fullName,
      contact,
      companyName,
      email: `whatsapp_${contact}@placeholder.com`,
      note: notes || "",
      leadStatus: leadStatus._id,
      leadSource: leadSource._id,
    });

    await incrementCount({
      statusId: lead.leadStatus,
      sourceId: lead.leadSource,
    });

    return res.status(201).json({
      status: "Success",
      message: "WhatsApp lead created successfully",
      data: {
        ...lead.toObject(),
        leadStatus: { _id: leadStatus._id, name: leadStatus.name },
        leadSource: { _id: leadSource._id, name: leadSource.name },
      },
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};


