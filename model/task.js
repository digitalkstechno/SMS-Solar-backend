const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    subject: { type: String, trim: true },
    description: { type: String, default: "" },
    startDate: { type: Date },
    endDate: { type: Date },
    taskStatus: { type: mongoose.Schema.Types.ObjectId, ref: "taskStatus" },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    assignedTeams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
    attachments: [
      {
        originalName: String,
        filename: String,
        path: String,
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Virtual for getting current status value
TaskSchema.virtual('status').get(function () {
  return this.taskStatus;
});

// Set virtuals to appear in JSON
TaskSchema.set('toJSON', { virtuals: true });
TaskSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Task", TaskSchema);
