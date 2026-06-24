const LEAD = require("../model/lead");
const { deleteUploadedFile } = require("../utils/fileHelper");
const { incrementCount, decrementCount } = require("../utils/leadCountHelper");
const LeadStatus = require("../model/leadStatus");
const LeadSource = require("../model/leadSources");
const LeadLabel = require("../model/leadLabel");
const Notification = require("../model/notification");
const ExcelJS = require("exceljs");
const fs = require("fs");
const { uploadToExternalService, deleteFileFromExternalService } = require("../utils/externalUploader");

const sanitizeObjectId = (id) => {
  if (id === "" || id === "null" || id === "undefined" || id === null) return undefined;
  return id;
};

exports.createLead = async (req, res) => {
  try {
    const leadData = { ...req.body };

    // Sanitize ObjectIds
    leadData.leadStatus = sanitizeObjectId(leadData.leadStatus);
    leadData.assignedTo = sanitizeObjectId(leadData.assignedTo);
    if (req.user && req.user._id) {
      leadData.createdBy = req.user._id;
    }
    console.log("=== CREATE LEAD DEBUG ===");
    console.log("Current Logged-in User:", req.user ? req.user._id : "N/A");
    console.log("Setting createdBy to:", leadData.createdBy);


    if (req.files && req.files.length > 0) {
      const newAttachments = [];
      for (const file of req.files) {
        const fileUrl = await uploadToExternalService(file, 'LeadAttachment');
        newAttachments.push({
          originalName: file.originalname,
          filename: file.originalname,
          path: fileUrl,
        });
      }
      leadData.attachments = newAttachments;
    }

    leadData.activities = [
      {
        message: "New Lead Created",
        by: req.user ? req.user._id : undefined,
        date: new Date()
      }
    ];

    const leadDetails = await LEAD.create(leadData);

    await incrementCount({
      statusId: leadDetails.leadStatus,

    });

    if (leadDetails.assignedTo && (!req.user || String(leadDetails.assignedTo) !== String(req.user._id))) {
      await Notification.create({
        recipient: leadDetails.assignedTo,
        title: "New Lead Assigned",
        message: `You have been assigned to a new lead: ${leadDetails.fullName}`,
        type: "lead",
        relatedId: leadDetails._id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    return res.status(201).json({
      status: "Success",
      message: "Leads created successfully",
      data: leadDetails,
    });
  } catch (error) {
    if (leadData.attachments && leadData.attachments.length > 0) {
      for (const el of leadData.attachments) {
        if (el.path && el.path.startsWith('http')) {
          await deleteFileFromExternalService(el.path).catch(console.error);
        } else if (el.filename) {
          deleteUploadedFile("images/LeadAttachment", el.filename);
        }
      }
    }
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllLeads = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search = "", status, staff, date, from, to } = req.query;

    // 🔥 BASE QUERY
    const query = {};
    const andConditions = [];

    /* =====================
       SEARCH (TEXT)
    ====================== */
    if (search) {
      andConditions.push({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { kwRequirement: { $regex: search, $options: "i" } },
          { discomName: { $regex: search, $options: "i" } },
        ]
      });
    }

    /* =====================
       STATUS FILTER
    ====================== */
    if (status) {
      const statusArr = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statusArr.length === 1) {
        query.leadStatus = statusArr[0];
      } else if (statusArr.length > 1) {
        query.leadStatus = { $in: statusArr };
      }
    }



    /* =====================
       STAFF FILTER
    ====================== */
    if (staff) {
      const staffArr = staff.split(',').map(s => s.trim()).filter(Boolean);
      if (staffArr.length === 1) {
        query.assignedTo = staffArr[0];
      } else if (staffArr.length > 1) {
        query.assignedTo = { $in: staffArr };
      }
    }

    /* =====================
       DATE RANGE FILTER
    ====================== */
    if (from || to) {
      const start = from ? new Date(from) : new Date(0);
      start.setHours(0, 0, 0, 0);

      const end = to ? new Date(to) : new Date();
      end.setHours(23, 59, 59, 999);

      query.createdAt = { $gte: start, $lte: end };
    } else if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      query.createdAt = { $gte: start, $lte: end };
    }

    if (req.leadScope === "own" && req.user && req.user._id) {
      andConditions.push({
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id }
        ]
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }
    console.log("=== FETCH LEADS DEBUG ===");
    console.log("leadScope:", req.leadScope);
    console.log("user:", req.user ? req.user._id : "N/A");
    console.log("Final query:", JSON.stringify(query));

    /* =====================
       DB QUERY
    ===================== */
    const totalLeads = await LEAD.countDocuments(query);

    const LeadData = await LEAD.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("leadStatus")
      .populate("assignedTo")
      .populate("followUps.staff", "fullName email");

    return res.status(200).json({
      status: "Success",
      message: "Leads fetched successfully",
      pagination: {
        totalRecords: totalLeads,
        currentPage: page,
        totalPages: Math.ceil(totalLeads / limit),
        limit,
      },
      data: LeadData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchMyLeads = async (req, res) => {
  req.leadScope = "own";
  return exports.fetchAllLeads(req, res);
};

exports.fetchLeadById = async (req, res) => {
  try {
    let LeadId = req.params.id;
    let leadData = await LEAD.findById(LeadId)
      .populate({ path: "leadStatus" })
      .populate({ path: "assignedTo" })
      .populate({ path: "followUps.staff", select: "fullName email" });
    if (!leadData) {
      throw new Error("Lead not found");
    }

    if (
      req.leadScope === "own" &&
      req.user &&
      (
        (!leadData.assignedTo || !leadData.assignedTo._id || String(leadData.assignedTo._id) !== String(req.user._id)) &&
        (!leadData.createdBy || String(leadData.createdBy) !== String(req.user._id))
      )
    ) {
      return res.status(403).json({
        status: "Fail",
        message: "Access denied",
      });
    }

    return res.status(200).json({
      status: "Success",
      message: "Lead fetched successfully",
      data: leadData,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.leadUpdate = async (req, res) => {
  try {
    let leadId = req.params.id;
    let oldLeads = await LEAD.findById(leadId);

    if (!oldLeads) {
      throw new Error("Lead not found");
    }

    const updateData = { ...req.body };

    // Sanitize ObjectIds
    updateData.leadStatus = sanitizeObjectId(updateData.leadStatus);
    updateData.assignedTo = sanitizeObjectId(updateData.assignedTo);


    let currentAttachments = [...(oldLeads.attachments || [])];

    // Handle deleteAttachments[] from FormData
    if (req.body["deleteAttachments[]"]) {
      const deleteIds = Array.isArray(req.body["deleteAttachments[]"])
        ? req.body["deleteAttachments[]"]
        : [req.body["deleteAttachments[]"]];

      // Filter out attachments to be deleted and delete them from filesystem/external service
      const attachmentsToDelete = currentAttachments.filter(att => {
        const id = att._id?.toString() || att.path;
        return deleteIds.includes(id);
      });

      for (const att of attachmentsToDelete) {
        if (att.path && att.path.startsWith('http')) {
          await deleteFileFromExternalService(att.path).catch(console.error);
        } else if (att.filename) {
          deleteUploadedFile("images/LeadAttachment", att.filename);
        }
      }

      currentAttachments = currentAttachments.filter(att => {
        const id = att._id?.toString() || att.path;
        return !deleteIds.includes(id);
      });
    }

    if (req.files && req.files.length > 0) {
      const newAttachments = [];
      for (const file of req.files) {
        const fileUrl = await uploadToExternalService(file, 'LeadAttachment');
        newAttachments.push({
          originalName: file.originalname,
          filename: file.originalname,
          path: fileUrl,
        });
      }
      updateData.attachments = [...currentAttachments, ...newAttachments];
    } else if (req.body["deleteAttachments[]"]) {
      // If no new files but some were deleted, we still need to update the list
      updateData.attachments = currentAttachments;
    }

    // 🔹 Follow-up staff injection & data sanitization
    if (updateData.followUps && Array.isArray(updateData.followUps)) {
      updateData.followUps = updateData.followUps.map(f => {
        if (!f.staff && req.user && req.user._id) {
          f.staff = req.user._id;
        }
        return f;
      });
    }

    let newActivities = [];
    if (updateData.leadStatus && updateData.leadStatus.toString() !== oldLeads.leadStatus?.toString()) {
      const statusDetails = await LeadStatus.findById(updateData.leadStatus);
      if (statusDetails) {
        newActivities.push({
          message: `Stage changed to ${statusDetails.name}`,
          by: req.user ? req.user._id : undefined,
          date: new Date()
        });
      }
    }

    if (updateData.followUps && Array.isArray(updateData.followUps) && oldLeads.followUps && updateData.followUps.length > oldLeads.followUps.length) {
      const latestFollowUp = updateData.followUps[updateData.followUps.length - 1];
      const datePart = latestFollowUp.date ? (typeof latestFollowUp.date === 'string' ? latestFollowUp.date.substring(0, 10) : latestFollowUp.date.toISOString().substring(0, 10)) : '';
      newActivities.push({
        message: `Follow-up added for ${datePart}${latestFollowUp.note ? ' | Note: ' + latestFollowUp.note : ''}`,
        by: req.user ? req.user._id : undefined,
        date: new Date()
      });
    }

    if (updateData.quotation && (!oldLeads.quotation || Object.keys(oldLeads.quotation).length === 0)) {
      newActivities.push({
        message: `Quotation Generated`,
        by: req.user ? req.user._id : undefined,
        date: new Date()
      });
    } else if (updateData.quotation) {
      newActivities.push({
        message: `Quotation Updated`,
        by: req.user ? req.user._id : undefined,
        date: new Date()
      });
    }

    if (updateData.quotations && Array.isArray(updateData.quotations)) {
      const oldLen = (oldLeads.quotations || []).length;
      const newLen = updateData.quotations.length;
      if (newLen > oldLen) {
        newActivities.push({
          message: `Quotation Added`,
          by: req.user ? req.user._id : undefined,
          date: new Date()
        });
      } else if (newLen < oldLen) {
        newActivities.push({
          message: `Quotation Deleted`,
          by: req.user ? req.user._id : undefined,
          date: new Date()
        });
      } else {
        newActivities.push({
          message: `Quotation Details Updated`,
          by: req.user ? req.user._id : undefined,
          date: new Date()
        });
      }
    }

    if (newActivities.length > 0) {
      updateData.activities = [...(oldLeads.activities || []), ...newActivities];
    }

    let updatedLeads = await LEAD.findByIdAndUpdate(leadId, updateData, {
      new: true,
    })
      .populate("leadStatus")
      .populate("assignedTo")
      .populate("followUps.staff", "fullName email");

    // 🔹 Status change handling
    if (
      oldLeads.leadStatus?.toString() !== updatedLeads.leadStatus?.toString()
    ) {
      await decrementCount({ statusId: oldLeads.leadStatus });
      await incrementCount({ statusId: updatedLeads.leadStatus });
    }



    // 🔹 Notification handling for reassignment
    const oldStaff = oldLeads.assignedTo ? String(oldLeads.assignedTo._id || oldLeads.assignedTo) : null;
    const newStaff = updatedLeads.assignedTo ? String(updatedLeads.assignedTo._id || updatedLeads.assignedTo) : null;

    if (newStaff && oldStaff !== newStaff && (!req.user || newStaff !== String(req.user._id))) {
      await Notification.create({
        recipient: newStaff,
        title: "Lead Assigned",
        message: `You have been assigned to the lead: ${updatedLeads.fullName}`,
        type: "lead",
        relatedId: updatedLeads._id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
    return res.status(200).json({
      status: "Success",
      message: "Lead updated successfully",
      data: updatedLeads,
    });
  } catch (error) {
    if (req.files) {
      req.files.map((el) =>
        deleteUploadedFile("images/LeadAttachment", el.filename),
      );
    }
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.leadDelete = async (req, res) => {
  try {
    let leadId = req.params.id;
    let oldLead = await LEAD.findById(leadId);

    if (!oldLead) {
      throw new Error("Lead not found");
    }
    if (oldLead.attachments && oldLead.attachments.length > 0) {
      oldLead.attachments.map((el) => {
        const fileName = (typeof el === 'object' && el.filename) ? el.filename : el;
        deleteUploadedFile("images/LeadAttachment", fileName);
      });
    }

    await decrementCount({
      statusId: oldLead.leadStatus,

    });

    await LEAD.findByIdAndDelete(leadId);

    return res.status(200).json({
      status: "Success",
      message: "Lead deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchLeadsForKanban = async (req, res) => {
  try {
    const { search, status, staff, date } = req.query;

    const match = {};
    const conditions = [];
    const myOnly = req.query.my === 'true';
    if ((req.leadScope === "own" || myOnly) && req.user && req.user._id) {
      conditions.push({
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id }
        ]
      });
    }

    // 🔥 SEARCH FILTER
    if (search) {
      conditions.push({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { kwRequirement: { $regex: search, $options: "i" } },
          { discomName: { $regex: search, $options: "i" } },
        ]
      });
    }

    if (conditions.length > 0) {
      match.$and = conditions;
    }

    // 🔥 STATUS FILTER (handle comma-separated values)
    if (status) {
      const statusArr = status.split(',').filter(s => s.trim());
      if (statusArr.length === 1) {
        match.leadStatus = statusArr[0];
      } else if (statusArr.length > 1) {
        match.leadStatus = { $in: statusArr };
      }
    }



    // 🔥 STAFF FILTER (handle comma-separated values)
    if (staff) {
      const staffArr = staff.split(',').filter(s => s.trim());
      if (staffArr.length === 1) {
        match.assignedTo = staffArr[0];
      } else if (staffArr.length > 1) {
        match.assignedTo = { $in: staffArr };
      }
    }

    // 🔥 DATE FILTER
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      match.createdAt = { $gte: start, $lte: end };
    }

    const allStatuses = await LeadStatus.find().sort({ order: 1 });

    // If statuses are selected, only return those statuses
    const statusesToFetch = status
      ? allStatuses.filter(s => {
        const statusArr = status.split(',');
        return statusArr.includes(s._id.toString());
      })
      : allStatuses;

    const kanbanData = await Promise.all(
      statusesToFetch.map(async (status) => {
        const leadMatch = { ...match, leadStatus: status._id };
        const leads = await LEAD.find(leadMatch)
          .populate("leadStatus")
          .populate("assignedTo")
          .sort({ createdAt: -1 })
          .limit(10);

        return {
          statusId: status._id.toString(),
          statusName: status.name,
          leads: leads || [],
        };
      })
    );

    return res.status(200).json({
      status: "Success",
      message: "Kanban leads fetched successfully",
      data: kanbanData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchKanbanLeadsByStatus = async (req, res) => {
  try {
    const { statusId, search, staff, date, page = 1, limit = 10 } = req.query;
    const match = { leadStatus: statusId };
    const conditions = [];
    const myOnly = req.query.my === 'true';

    if ((req.leadScope === "own" || myOnly) && req.user && req.user._id) {
      conditions.push({
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id }
        ]
      });
    }

    if (search) {
      conditions.push({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { kwRequirement: { $regex: search, $options: "i" } },
        ]
      });
    }

    if (conditions.length > 0) {
      match.$and = conditions;
    }



    if (staff) {
      const staffArr = staff.split(',').filter(s => s.trim());
      if (staffArr.length === 1) match.assignedTo = staffArr[0];
      else if (staffArr.length > 1) match.assignedTo = { $in: staffArr };
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      match.createdAt = { $gte: start, $lte: end };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const leads = await LEAD.find(match)
      .populate("leadStatus")
      .populate("assignedTo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LEAD.countDocuments(match);

    return res.status(200).json({
      status: "Success",
      data: leads,
      pagination: {
        totalRecords: total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.updateKanbanStatus = async (req, res) => {
  try {
    const leadId = req.params.id;
    const { leadStatus } = req.body;

    const oldLead = await LEAD.findById(leadId);
    if (!oldLead) {
      throw new Error("Lead not found");
    }

    const previousStatus = oldLead.leadStatus ? oldLead.leadStatus.toString() : null;

    // Update status
    oldLead.leadStatus = leadStatus;
    await oldLead.save();

    // Update count
    if (previousStatus !== leadStatus.toString()) {
      if (previousStatus) await decrementCount({ statusId: previousStatus });
      await incrementCount({ statusId: leadStatus });

      const newStatusObj = await LeadStatus.findById(leadStatus);
      if (newStatusObj) {
        oldLead.activities = oldLead.activities || [];
        oldLead.activities.push({
          message: `Stage changed to ${newStatusObj.name}`,
          by: req.user ? req.user._id : undefined,
          date: new Date()
        });
        await oldLead.save();
      }
    }

    return res.status(200).json({
      status: "Success",
      message: "Lead status updated",
      data: oldLead,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getKanbanCounts = async (req, res) => {
  try {
    const { search, status, staff, date } = req.query;

    const match = {};
    const conditions = [];
    const myOnly = req.query.my === 'true';
    if ((req.leadScope === "own" || myOnly) && req.user && req.user._id) {
      conditions.push({
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id }
        ]
      });
    }

    // 🔥 SEARCH FILTER
    if (search) {
      conditions.push({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { kwRequirement: { $regex: search, $options: "i" } },
          { discomName: { $regex: search, $options: "i" } },
        ]
      });
    }

    if (conditions.length > 0) {
      match.$and = conditions;
    }



    // 🔥 STAFF FILTER (handle comma-separated values)
    if (staff) {
      const staffArr = staff.split(',').filter(s => s.trim());
      if (staffArr.length === 1) {
        match.assignedTo = staffArr[0];
      } else if (staffArr.length > 1) {
        match.assignedTo = { $in: staffArr };
      }
    }

    // 🔥 DATE FILTER
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      match.createdAt = { $gte: start, $lte: end };
    }

    const pipeline = [];
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }
    pipeline.push({
      $group: {
        _id: "$leadStatus",
        total: { $sum: 1 },
      },
    });

    const counts = await LEAD.aggregate(pipeline);

    return res.status(200).json({
      status: "Success",
      data: counts,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getLeadCountSummary = async (req, res) => {
  try {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const endOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const allStatuses = await LeadStatus.find().select("_id name").sort({ order: 1 });

    const { search, staff, date, from, to } = req.query;

    const baseMatch = {};
    const conditions = [];
    const myOnly = req.query.my === 'true';
    if ((req.leadScope === "own" || myOnly) && req.user && req.user._id) {
      conditions.push({
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id }
        ]
      });
    }

    // 🔥 SEARCH FILTER
    if (search) {
      conditions.push({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { kwRequirement: { $regex: search, $options: "i" } },
          { discomName: { $regex: search, $options: "i" } },
        ]
      });
    }

    if (conditions.length > 0) {
      baseMatch.$and = conditions;
    }


    // 🔥 STAFF FILTER (handle comma-separated values)
    if (staff) {
      const staffArr = staff.split(',').filter(s => s.trim());
      if (staffArr.length === 1) {
        baseMatch.assignedTo = staffArr[0];
      } else if (staffArr.length > 1) {
        baseMatch.assignedTo = { $in: staffArr };
      }
    }

    // 🔥 DATE RANGE FILTER
    if (from || to) {
      const start = from ? new Date(from) : new Date(0);
      start.setHours(0, 0, 0, 0);

      const end = to ? new Date(to) : new Date();
      end.setHours(23, 59, 59, 999);

      baseMatch.createdAt = { $gte: start, $lte: end };
    } else if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      baseMatch.createdAt = { $gte: start, $lte: end };
    }

    const counts = await LEAD.aggregate([
      {
        $facet: {
          totalLeads: [
            Object.keys(baseMatch).length > 0 ? { $match: baseMatch } : null,
            { $count: "count" },
          ].filter(Boolean),

          monthlyLeads: [
            {
              $match: {
                ...baseMatch,
                createdAt: {
                  $gte: startOfMonth,
                  $lte: endOfMonth,
                },
              },
            },
            { $count: "count" },
          ],

          statusWise: [
            Object.keys(baseMatch).length > 0 ? { $match: baseMatch } : null,
            {
              $group: {
                _id: "$leadStatus",
                count: { $sum: 1 },
              },
            },
          ].filter(Boolean),

          totalRevenue: [
            Object.keys(baseMatch).length > 0 ? { $match: baseMatch } : null,
            {
              $group: {
                _id: null,
                total: { $sum: "$paymentAmount" },
              },
            },
          ].filter(Boolean),
        },
      },
    ]);

    const totalLeads = counts[0]?.totalLeads[0]?.count || 0;
    const monthlyLeads = counts[0]?.monthlyLeads[0]?.count || 0;
    const totalRevenue = counts[0]?.totalRevenue[0]?.total || 0;
    const statusWiseRaw = counts[0]?.statusWise || [];

    const statusWiseCounts = allStatuses.map((status) => {
      const found = statusWiseRaw.find(
        (el) => el._id?.toString() === status._id.toString(),
      );

      return {
        statusId: status._id,
        statusName: status.name,
        count: found ? found.count : 0,
      };
    });

    return res.status(200).json({
      status: "Success",
      data: {
        totalLeads,
        currentMonthLeads: monthlyLeads,
        totalRevenue,
        statusWiseCounts,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getMyLeadSummary = async (req, res) => {
  req.leadScope = "own";
  return exports.getLeadCountSummary(req, res);
};

exports.getMyUpcomingFollowups = async (req, res) => {
  req.leadScope = "own";
  return exports.getUpcomingFollowups(req, res);
};

exports.getMyDueFollowups = async (req, res) => {
  req.leadScope = "own";
  return exports.getDueFollowups(req, res);
};

exports.getUpcomingFollowups = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date();

    const matchStage = {
      isActive: { $ne: false },
      nextFollowupDate: { $ne: null, $exists: true },
    };

    if (req.leadScope === "own" && req.user && req.user._id) {
      matchStage.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    const basePipeline = [
      {
        $match: matchStage,
      },
      {
        $addFields: {
          followupDateTime: {
            $dateFromString: {
              dateString: {
                $concat: [
                  {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$nextFollowupDate",
                    },
                  },
                  " ",
                  {
                    $cond: {
                      if: { $in: ["$nextFollowupTime", [null, ""]] },
                      then: "00:00",
                      else: "$nextFollowupTime"
                    }
                  }
                ],
              },
              format: "%Y-%m-%d %H:%M",
              timezone: "Asia/Kolkata", // 🔥 CRITICAL FIX
              onError: null,
              onNull: null,
            },
          },
        },
      },
      {
        $match: { followupDateTime: { $ne: null } }
      },
      {
        $match: {
          followupDateTime: { $gte: now },
        },
      },
    ];

    // 👉 total count
    const totalResult = await LEAD.aggregate([
      ...basePipeline,
      { $count: "count" },
    ]);

    const total = totalResult[0]?.count || 0;

    // 👉 paginated data
    const leads = await LEAD.aggregate([
      ...basePipeline,
      { $sort: { followupDateTime: 1 } }, // nearest first
      { $skip: skip },
      { $limit: limit },

      // populate leadStatus
      {
        $lookup: {
          from: "leadstatuses",
          localField: "leadStatus",
          foreignField: "_id",
          as: "leadStatus",
        },
      },
      { $unwind: { path: "$leadStatus", preserveNullAndEmptyArrays: true } },

      // populate assignedTo
      {
        $lookup: {
          from: "staffs",
          localField: "assignedTo",
          foreignField: "_id",
          as: "assignedTo",
        },
      },
      { $unwind: { path: "$assignedTo", preserveNullAndEmptyArrays: true } },

    ]);

    return res.status(200).json({
      status: "Success",
      message: "Upcoming followups fetched",
      pagination: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
      data: leads,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getDueFollowups = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date();

    const matchStage = {
      isActive: { $ne: false },
      nextFollowupDate: { $ne: null, $exists: true },
    };

    if (req.leadScope === "own" && req.user && req.user._id) {
      matchStage.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    const basePipeline = [
      {
        $match: matchStage,
      },
      {
        $addFields: {
          followupDateTime: {
            $dateFromString: {
              dateString: {
                $concat: [
                  {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: "$nextFollowupDate",
                    },
                  },
                  " ",
                  {
                    $cond: {
                      if: { $in: ["$nextFollowupTime", [null, ""]] },
                      then: "00:00",
                      else: "$nextFollowupTime"
                    }
                  }
                ],
              },
              format: "%Y-%m-%d %H:%M",
              timezone: "Asia/Kolkata", // 🔥 IMPORTANT
              onError: null,
              onNull: null,
            },
          },
        },
      },
      {
        $match: { followupDateTime: { $ne: null } }
      },
      {
        $match: {
          followupDateTime: { $lt: now }, // ✅ due logic
        },
      },
    ];

    // 👉 total count
    const totalResult = await LEAD.aggregate([
      ...basePipeline,
      { $count: "count" },
    ]);

    const total = totalResult[0]?.count || 0;

    // 👉 paginated data
    const leads = await LEAD.aggregate([
      ...basePipeline,
      { $sort: { followupDateTime: 1 } }, // most overdue first
      { $skip: skip },
      { $limit: limit },

      // populate leadStatus
      {
        $lookup: {
          from: "leadstatuses",
          localField: "leadStatus",
          foreignField: "_id",
          as: "leadStatus",
        },
      },
      { $unwind: { path: "$leadStatus", preserveNullAndEmptyArrays: true } },

      // populate assignedTo
      {
        $lookup: {
          from: "staffs",
          localField: "assignedTo",
          foreignField: "_id",
          as: "assignedTo",
        },
      },
      { $unwind: { path: "$assignedTo", preserveNullAndEmptyArrays: true } },

    ]);

    return res.status(200).json({
      status: "Success",
      message: "Due followups fetched",
      pagination: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
      data: leads,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

// Get Lost Leads
// Get Won Leads
exports.getWonLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, staff, date } = req.query;

    // First find the Won status
    const wonStatus = await LeadStatus.findOne({ name: { $regex: /^won$/i } }); // Case insensitive

    if (!wonStatus) {
      return res.status(200).json({
        status: "Success",
        message: "No won leads found",
        pagination: {
          totalRecords: 0,
          currentPage: page,
          totalPages: 0,
          limit,
        },
        data: [],
      });
    }

    const query = {
      leadStatus: wonStatus._id,
    };
    const andConditions = [];

    if (req.leadScope === "own" && req.user && req.user._id) {
      andConditions.push({
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id }
        ]
      });
    }

    // 🔥 SEARCH FILTER
    if (search) {
      andConditions.push({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { kwRequirement: { $regex: search, $options: "i" } },
          { discomName: { $regex: search, $options: "i" } },
        ]
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }


    // 🔥 STAFF FILTER (handle comma-separated values)
    if (staff) {
      const staffArr = staff.split(',').filter(s => s.trim());
      if (staffArr.length === 1) {
        query.assignedTo = staffArr[0];
      } else if (staffArr.length > 1) {
        query.assignedTo = { $in: staffArr };
      }
    }

    // 🔥 DATE FILTER
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const total = await LEAD.countDocuments(query);

    const leads = await LEAD.find(query)
      .populate("leadStatus")
      .populate("assignedTo")
      .populate("leadLabel")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      status: "Success",
      message: "Won leads fetched",
      pagination: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
      data: leads,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

// Get Lost Leads
exports.getLostLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, staff, date } = req.query;

    // First find the Lost status
    const lostStatus = await LeadStatus.findOne({ name: { $regex: /^lost$/i } }); // Case insensitive

    if (!lostStatus) {
      return res.status(200).json({
        status: "Success",
        message: "No lost leads found",
        pagination: {
          totalRecords: 0,
          currentPage: page,
          totalPages: 0,
          limit,
        },
        data: [],
      });
    }

    const query = {
      leadStatus: lostStatus._id,
      isActive: true
    };
    const andConditions = [];

    if (req.leadScope === "own" && req.user && req.user._id) {
      andConditions.push({
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id }
        ]
      });
    }

    // 🔥 SEARCH FILTER
    if (search) {
      andConditions.push({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { kwRequirement: { $regex: search, $options: "i" } },
          { discomName: { $regex: search, $options: "i" } },
        ]
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }


    // 🔥 STAFF FILTER
    if (staff) {
      query.assignedTo = staff;
    }

    // 🔥 DATE FILTER
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const total = await LEAD.countDocuments(query);

    const leads = await LEAD.find(query)
      .populate("leadStatus")
      .populate("assignedTo")
      .populate("leadLabel")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      status: "Success",
      message: "Lost leads fetched",
      pagination: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
      data: leads,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

// DELETE /api/leads/:leadId/attachments/:attachmentId
exports.deleteAttachment = async (req, res) => {
  try {
    const { leadId, attachmentId } = req.params;

    const lead = await LEAD.findById(leadId);
    if (!lead) {
      return res.status(404).json({ status: "Fail", message: "Lead not found" });
    }

    // Find the attachment
    const attachment = lead.attachments.find(
      (att) => att._id?.toString() === attachmentId || att.path === attachmentId
    );

    if (!attachment) {
      return res.status(404).json({ status: "Fail", message: "Attachment not found" });
    }

    // Delete file from filesystem
    if (attachment.filename) {
      deleteUploadedFile("images/LeadAttachment", attachment.filename);
    }

    // Remove from DB
    lead.attachments = lead.attachments.filter(
      (att) => att._id?.toString() !== attachmentId && att.path !== attachmentId
    );
    await lead.save();

    return res.status(200).json({
      status: "Success",
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.exportLeadsToExcel = async (req, res) => {
  try {
    const { search = "", status, staff, from, to, date } = req.query;

    const query = {};
    const andConditions = [];

    // SEARCH
    if (search) {
      andConditions.push({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { kwRequirement: { $regex: search, $options: "i" } },
        ]
      });
    }

    // STATUS
    if (status) {
      const arr = status.split(",").map((s) => s.trim()).filter(Boolean);
      query.leadStatus = arr.length === 1 ? arr[0] : { $in: arr };
    }


    // STAFF
    if (staff) {
      const arr = staff.split(",").map((s) => s.trim()).filter(Boolean);
      query.assignedTo = arr.length === 1 ? arr[0] : { $in: arr };
    }

    // DATE RANGE
    if (from || to) {
      const start = from ? new Date(from) : new Date(0);
      start.setHours(0, 0, 0, 0);
      const end = to ? new Date(to) : new Date();
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    // OWN SCOPE
    if (req.leadScope === "own" && req.user && req.user._id) {
      andConditions.push({
        $or: [
          { assignedTo: req.user._id },
          { createdBy: req.user._id }
        ]
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const leads = await LEAD.find(query)
      .sort({ createdAt: -1 })
      .populate("leadStatus", "name")
      .populate("assignedTo", "fullName email");

    // ── Build Excel ───────────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CRM System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Leads", {
      pageSetup: { fitToPage: true, orientation: "landscape" },
    });

    // Column definitions
    sheet.columns = [
      { header: "S.No", key: "sno", width: 7 },
      { header: "Full Name", key: "fullName", width: 22 },
      { header: "Email", key: "email", width: 28 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "KW Requirement", key: "kwRequirement", width: 16 },
      { header: "Discom Name", key: "discomName", width: 20 },
      { header: "Lead Reference", key: "leadrefrance", width: 18 },
      { header: "Project Type", key: "projecttype", width: 18 },
      { header: "Lead Status", key: "status", width: 18 },
      { header: "Assigned To", key: "assigned", width: 20 },
      { header: "Priority", key: "priority", width: 12 },
      { header: "Created At", key: "createdAt", width: 18 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E40AF" }, // deep blue
      };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        bottom: { style: "medium", color: { argb: "FF1E40AF" } },
      };
    });
    headerRow.height = 28;

    // Fill data rows
    leads.forEach((lead, idx) => {
      const row = sheet.addRow({
        sno: idx + 1,
        fullName: lead.fullName || "",
        email: lead.email || "",
        phone: lead.contact || "",
        kwRequirement: lead.kwRequirement || "",
        discomName: lead.discomName || "",
        leadrefrance: lead.leadrefrance || "",
        projecttype: lead.projecttype || "",
        status: lead.leadStatus?.name || "",
        assigned: lead.assignedTo?.fullName || "",
        priority: lead.priority || "",
        createdAt: lead.createdAt
          ? new Date(lead.createdAt).toLocaleDateString("en-IN")
          : "",
      });

      // Alternate row shading
      if (idx % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0F4FF" },
          };
        });
      }

      row.eachCell((cell) => {
        cell.alignment = { vertical: "middle", horizontal: "left" };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
      row.height = 22;
    });

    // Freeze header
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    // Auto-filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    // Stream the file
    const fileName = `leads_export_${Date.now()}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const { leadId, attachmentId } = req.params;

    const lead = await LEAD.findById(leadId);
    if (!lead) return res.status(404).json({ status: "Fail", message: "Lead not found" });

    const attachmentIndex = lead.attachments.findIndex(
      (a) => a._id.toString() === attachmentId
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({ status: "Fail", message: "Attachment not found" });
    }

    const attachment = lead.attachments[attachmentIndex];

    // Delete file from filesystem or external service
    if (attachment.path && attachment.path.startsWith('http')) {
      const { deleteFileFromExternalService } = require("../utils/externalUploader");
      await deleteFileFromExternalService(attachment.path).catch(console.error);
    } else if (attachment.filename) {
      const { deleteUploadedFile } = require("../utils/fileHelper");
      deleteUploadedFile("images/LeadAttachment", attachment.filename);
    }

    // Remove from array and save
    lead.attachments.splice(attachmentIndex, 1);
    await lead.save();

    return res.status(200).json({ status: "Success", message: "Attachment deleted successfully" });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// BULK IMPORT – Step 1: Download Template (with master-data dropdowns)
// ────────────────────────────────────────────────────────────────────────────
exports.downloadImportTemplate = async (req, res) => {
  try {
    const [statuses, labels] = await Promise.all([
      LeadStatus.find().select("name").lean(),
      LeadLabel.find().select("name").lean(),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CRM System";
    workbook.created = new Date();

    // ── Hidden master sheets (for dropdown source data) ────────────────────
    const statusSheet = workbook.addWorksheet("__statuses", { state: "veryHidden" });
    statusSheet.addRows(statuses.map((s) => [s.name]));



    const labelSheet = workbook.addWorksheet("__labels", { state: "veryHidden" });
    labelSheet.addRows(labels.map((l) => [l.name]));

    // ── Main data sheet ───────────────────────────────────────────────────
    const sheet = workbook.addWorksheet("Leads Import", {
      pageSetup: { fitToPage: true, orientation: "landscape" },
    });

    // Column definitions – only core importable fields
    const COLUMNS = [
      { header: "Full Name *", key: "fullName", width: 24 },
      { header: "Contact *", key: "contact", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "KW Requirement", key: "kwRequirement", width: 18 },
      { header: "Discom Name", key: "discomName", width: 20 },
      { header: "Lead Reference", key: "leadrefrance", width: 20 },
      { header: "Project Type", key: "projecttype", width: 20 },
      { header: "Address", key: "address", width: 28 },
      { header: "Location Link", key: "locationLink", width: 28 },
      { header: "Lead Status *", key: "leadStatus", width: 20 },
      { header: "Note", key: "note", width: 30 },
    ];

    sheet.columns = COLUMNS;

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = { bottom: { style: "medium", color: { argb: "FF1E40AF" } } };
    });
    headerRow.height = 30;

    // Add a sample row
    const sampleRow = sheet.addRow({
      fullName: "John Doe",
      contact: "9876543210",
      email: "john@example.com",
      companyName: "Acme Corp",
      address: "123 Main St",
      leadStatus: statuses[0]?.name || "",
      note: "Sample note",
    });
    sampleRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
      cell.alignment = { vertical: "middle" };
    });
    sampleRow.height = 22;

    // ── Data validation (dropdowns) for rows 2-1001 ───────────────────────
    const COL = { leadStatus: 6 }; // 1-based col index

    const statusFormula = `__statuses!$A$1:$A$${statuses.length || 1}`;

    for (let row = 2; row <= 1001; row++) {
      sheet.getCell(row, COL.leadStatus).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [statusFormula],
        showErrorMessage: true,
        errorTitle: "Invalid Status",
        error: "Please select a valid Lead Status from the dropdown.",
      };
    }

    // Freeze header
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    // Stream the file
    const fileName = "leads_import_template.xlsx";
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// BULK IMPORT – Step 2: Process uploaded Excel, validate & insert
// Returns: { imported, failed } – and if failed > 0, sends back a failed-rows Excel
// ────────────────────────────────────────────────────────────────────────────
exports.bulkImportLeads = async (req, res) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ status: "Fail", message: "No file uploaded" });
    }

    // Load master data for name→ID lookup
    const [statuses] = await Promise.all([
      LeadStatus.find().lean(),
    ]);

    const statusMap = {};
    statuses.forEach((s) => { statusMap[s.name.trim().toLowerCase()] = s._id; });

    // Parse Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet("Leads Import");
    if (!sheet) {
      return res.status(400).json({ status: "Fail", message: "Invalid template: 'Leads Import' sheet not found" });
    }

    const VALID_PRIORITIES = ["high", "medium", "low"];

    const successRows = [];
    const failedRows = []; // { rowNum, rowData, errors }

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const getCellValue = (col) => {
        const cell = row.getCell(col);
        const val = cell.value;
        if (val === null || val === undefined) return "";
        if (typeof val === "object" && val.richText) {
          return val.richText.map((rt) => rt.text).join("").trim();
        }
        return String(val).trim();
      };

      const fullName = getCellValue(1);
      const contact = getCellValue(2);
      const email = getCellValue(3);
      const kwRequirement = getCellValue(4);
      const discomName = getCellValue(5);
      const leadrefrance = getCellValue(6);
      const projecttype = getCellValue(7);
      const address = getCellValue(8);
      const locationLink = getCellValue(9);
      const statusName = getCellValue(10);
      const note = getCellValue(11);

      // Skip completely empty rows
      if (!fullName && !contact && !kwRequirement && !statusName && !discomName) return;

      const errors = [];

      if (!fullName) errors.push("Full Name is required");
      if (!contact) errors.push("Contact is required");

      const statusId = statusName ? statusMap[statusName.toLowerCase()] : null;
      if (!statusName) errors.push("Lead Status is required");
      else if (!statusId) errors.push(`Lead Status '${statusName}' not found in master`);

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("Invalid email format");
      }

      if (errors.length > 0) {
        failedRows.push({ rowNumber, fullName, contact, email, kwRequirement, discomName, leadrefrance, projecttype, address, locationLink, statusName, note, errors: errors.join(" | ") });
      } else {
        successRows.push({ fullName, contact, email: email || undefined, kwRequirement, discomName, leadrefrance: leadrefrance || undefined, projecttype: projecttype || undefined, address: address || undefined, locationLink: locationLink || undefined, leadStatus: statusId, note: note || undefined });
      }
    });

    // Bulk insert successful rows
    let imported = 0;
    const insertErrors = [];
    for (const leadData of successRows) {
      try {
        if (req.user && req.user._id) {
          leadData.createdBy = req.user._id;
        }
        const lead = await LEAD.create(leadData);
        await incrementCount({ statusId: lead.leadStatus });
        imported++;
      } catch (err) {
        // Move to failed if DB validation fails (e.g. duplicate metaLeadId)
        insertErrors.push({ ...leadData, errors: err.message });
      }
    }

    // Merge DB insert errors into failedRows
    const allFailed = [
      ...failedRows,
      ...insertErrors.map((r) => ({
        rowNumber: "DB",
        fullName: r.fullName,
        contact: r.contact,
        email: r.email || "",
        kwRequirement: r.kwRequirement,
        discomName: r.discomName,
        address: r.address || "",
        locationLink: r.locationLink || "",
        statusName: r.leadStatus?.toString() || "",
        note: r.note || "",
        errors: r.errors,
      })),
    ];

    // Clean up uploaded temp file
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // If there are failed rows, return them as Excel
    if (allFailed.length > 0) {
      const failWb = new ExcelJS.Workbook();
      const failSheet = failWb.addWorksheet("Failed Leads");

      failSheet.columns = [
        { header: "Row #", key: "rowNumber", width: 8 },
        { header: "Full Name", key: "fullName", width: 22 },
        { header: "Contact", key: "contact", width: 16 },
        { header: "Email", key: "email", width: 26 },
        { header: "KW Req", key: "kwRequirement", width: 14 },
        { header: "Discom Name", key: "discomName", width: 20 },
        { header: "Address", key: "address", width: 26 },
        { header: "Location Link", key: "locationLink", width: 26 },
        { header: "Lead Status", key: "statusName", width: 18 },
        { header: "Note", key: "note", width: 28 },
        { header: "Failure Reason", key: "errors", width: 50 },
      ];

      // Style header
      const hRow = failSheet.getRow(1);
      hRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      hRow.height = 28;

      allFailed.forEach((f) => {
        const r = failSheet.addRow({
          rowNumber: f.rowNumber,
          fullName: f.fullName,
          contact: f.contact,
          email: f.email,
          kwRequirement: f.kwRequirement,
          discomName: f.discomName,
          address: f.address,
          locationLink: f.locationLink,
          statusName: f.statusName,
          note: f.note,
          errors: f.errors,
        });
        r.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1F2" } };
          cell.alignment = { vertical: "middle" };
        });
        // Highlight error column in red
        r.getCell(11).font = { color: { argb: "FFDC2626" }, bold: true };
        r.height = 20;
      });

      failSheet.views = [{ state: "frozen", ySplit: 1 }];

      // Add summary at top
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="failed_leads_${Date.now()}.xlsx"`);
      res.setHeader("X-Import-Imported", String(imported));
      res.setHeader("X-Import-Failed", String(allFailed.length));
      await failWb.xlsx.write(res);
      return res.end();
    }

    // All rows succeeded
    return res.status(200).json({
      status: "Success",
      message: `${imported} lead(s) imported successfully`,
      data: { imported, failed: 0 },
    });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) { }
    }
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

// Add payment to lead
exports.addPayment = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { amount, date, mode } = req.body;

    const lead = await LEAD.findById(leadId);
    if (!lead) {
      return res.status(404).json({ status: "Fail", message: "Lead not found" });
    }

    const payment = {
      amount: Number(amount),
      date: new Date(date),
      mode,
    };

    // Handle payment proof
    if (req.file) {
      const fileUrl = await uploadToExternalService(req.file, 'PaymentProof');
      payment.proof = {
        originalName: req.file.originalname,
        filename: req.file.originalname,
        path: fileUrl,
      };
    }

    lead.payments = lead.payments || [];
    lead.payments.push(payment);

    // Update total payment amount
    lead.paymentAmount = lead.payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    await lead.save();

    return res.status(200).json({
      status: "Success",
      message: "Payment added successfully",
      data: lead,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

// Get payments for a lead
exports.getPayments = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await LEAD.findById(leadId);

    if (!lead) {
      return res.status(404).json({ status: "Fail", message: "Lead not found" });
    }

    const payments = lead.payments || [];
    const totalReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return res.status(200).json({
      status: "Success",
      data: {
        payments,
        totalReceived,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

// Migration to populate createdBy for existing leads
const migrateExistingLeads = async () => {
  try {
    const leads = await LEAD.find({ createdBy: { $exists: false } });
    if (leads.length > 0) {
      console.log(`[Migration] Found ${leads.length} leads without createdBy. Migrating...`);
      for (const lead of leads) {
        // Find the creator in activities
        const creationActivity = lead.activities?.find((a) => a.message === "New Lead Created" || a.message?.toLowerCase().includes("created"));
        if (creationActivity && creationActivity.by) {
          lead.createdBy = creationActivity.by;
          await lead.save();
        } else {
          // Fallback to assignedTo if no creation activity exists
          if (lead.assignedTo) {
            lead.createdBy = lead.assignedTo;
            await lead.save();
          }
        }
      }
      console.log("[Migration] Leads migration completed.");
    }
  } catch (err) {
    console.error("[Migration] Error migrating leads:", err);
  }
};
setTimeout(migrateExistingLeads, 5000); // Run 5 seconds after startup
