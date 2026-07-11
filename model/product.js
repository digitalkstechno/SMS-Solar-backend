  let mongoose = require("mongoose");

let Schema = mongoose.Schema;

let ProductSchema = new Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    currentStock: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      default: "Qty",
    },
  },
  { timestamps: true }
);

let PRODUCT = mongoose.model("product", ProductSchema);
module.exports = PRODUCT;
