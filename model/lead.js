const mongoose = require("mongoose");

const { Schema } = mongoose;

const LeadSchema = new Schema(
  {
    fullName: {
      type: String,
    },

    contact: {
      type: String,
    },

    email: {
      type: String,
      lowercase: true,
    },

    kwRequirement: {
      type: String,
    },

    discomName: {
      type: String,
    },

    leadrefrance: {
      type: String,
    },

    address: {
      type: String,
    },

    city: {
      type: String,
    },

    locationLink: {
      type: String,
    },

    leadStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "leadStatus",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    leadLabel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "leadLabel",
    },
    projecttype: {
      type: String,
    },
    lostReason: {
      type: String,
    },
    lostDate: {
      type: Date,
    },
    wonDate: {
      type: Date,
    },
    followUps: [
      {
        date: { type: Date },
        time: { type: String },
        note: { type: String, trim: true },
        staff: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    attachments: [
      {
        originalName: String,
        filename: String,
        path: String,
      },
    ],
    activities: [
      {
        message: { type: String },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        date: { type: Date, default: Date.now },
      }
    ],
    quotation: {
      date: Date,
      solarModule: String,
      inverter: String,
      options: [String],
      rows: [
        {
          title: String,
          values: [String]
        }
      ]
    },
    quotations: [
      {
        date: Date,
        solarModule: String,
        inverter: String,
        options: [String],
        rows: [
          {
            title: String,
            values: [String]
          }
        ]
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    nextFollowupDate: {
      type: Date,
      default: null,
    },
    nextFollowupTime: {
      type: String,
      default: null,
    },
    lastFollowUp: {
      type: Date,
    },
    metaLeadId: {
      type: String,
      unique: true,
      sparse: true
    },
    metaRawData: {
      type: Object
    },
    paymentAmount: {
      type: Number,
      default: 0,
    },
    payments: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, required: true },
        mode: { type: String, required: true, enum: ['Cash', 'GPay', 'Bank Transfer'] },
        proof: {
          originalName: String,
          filename: String,
          path: String,
        },
        createdAt: { type: Date, default: Date.now }
      }
    ],
  },
  {
    timestamps: true,
  },
);

const LEAD = mongoose.model("Lead", LeadSchema);
module.exports = LEAD;
