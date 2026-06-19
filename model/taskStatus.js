let mongoose = require("mongoose");

let Schema = mongoose.Schema;

let TaskStatusSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        order: {
            type: Number,
        },
        color: {
            type: String,
            default: "#6B7280",
        },
    },
    { timestamps: true },
);

let TASKSTATUS = mongoose.model("taskStatus", TaskStatusSchema);
module.exports = TASKSTATUS;
