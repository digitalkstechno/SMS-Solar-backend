let mongoose = require("mongoose");

let Schema = mongoose.Schema;

let CategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

let CATEGORY = mongoose.model("category", CategorySchema);
module.exports = CATEGORY;
