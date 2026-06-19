const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const LeadLabelSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Label name is required"],
      trim: true,
    },
    color: {
      type: String,
      required: [true, "Color is required"],
      validate: {
        validator: function(v) {
          // Validate hex color code (e.g., #FF0000, #f00, #ff00ff)
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: props => `${props.value} is not a valid hex color code!`
      }
    },
    order: {
      type: Number,
      unique: true,
      sparse: true, // Allows null/undefined values
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { 
    timestamps: true 
  }
);

// Add index for better query performance
LeadLabelSchema.index({ name: 1 });
LeadLabelSchema.index({ color: 1 });

const LEADLABEL = mongoose.model("leadLabel", LeadLabelSchema);

module.exports = LEADLABEL;