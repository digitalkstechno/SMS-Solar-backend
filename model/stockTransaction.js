const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const StockTransactionSchema = new Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },
    type: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be greater than 0"],
    },
    note: {
      type: String,
      trim: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: false,
    },
    issuedTo: {
      type: String,
      trim: true,
      required: false,
    },
    unit: {
      type: String,
      trim: true,
      required: false,
    },
  },
  { timestamps: true }
);

const STOCK_TRANSACTION = mongoose.model("stockTransaction", StockTransactionSchema);
module.exports = STOCK_TRANSACTION;
