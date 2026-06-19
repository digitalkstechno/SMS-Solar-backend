let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let TeamSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", TeamSchema);
