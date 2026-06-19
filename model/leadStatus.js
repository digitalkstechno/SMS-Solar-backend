let mongoose = require("mongoose");

let Schema = mongoose.Schema;

let LeadStatusSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

let LEADSTATUS = mongoose.model("leadStatus", LeadStatusSchema);
module.exports = LEADSTATUS;
