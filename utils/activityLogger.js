const ActivityLog = require("../model/activityLog");

async function logActivity(req, { action, module, entityId, entityName, details }) {
  try {
    let performedBy = null;
    let userName = "System";
    let userEmail = "";
    let userRole = "";

    if (req && req.user) {
      performedBy = req.user._id || req.user.id;
      userName = req.user.name || `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || req.user.email || "Unknown User";
      userEmail = req.user.email || "";
      userRole = req.user.role?.roleName || req.user.role || "";
    }

    const ipAddress = req ? (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "") : "";
    const userAgent = req ? req.headers["user-agent"] : "";

    await ActivityLog.create({
      performedBy,
      userName,
      userEmail,
      userRole,
      action,
      module,
      entityId: entityId ? entityId.toString() : "",
      entityName: entityName || "",
      details: details || {},
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

module.exports = { logActivity };
