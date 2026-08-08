const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: false,
    },
    userEmail: {
      type: String,
    },
    userName: {
      type: String,
    },
    userRole: {
      type: String,
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE"],
      required: true,
    },
    module: {
      type: String,
      enum: ["Department", "User", "Lead"],
      required: true,
    },
    entityId: {
      type: String,
    },
    entityName: {
      type: String,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
