let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let OrganizationSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", OrganizationSchema);
