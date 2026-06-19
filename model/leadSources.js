let mongoose = require("mongoose");

let Schema = mongoose.Schema;

let LeadSourcesSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      unique: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

let LEADSOURCES = mongoose.model("leadSource", LeadSourcesSchema);
module.exports = LEADSOURCES;
