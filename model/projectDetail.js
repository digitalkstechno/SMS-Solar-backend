const mongoose = require("mongoose");
const { Schema } = mongoose;

const fileSchema = new Schema(
  {
    originalName: String,
    filename: String,
    path: String,
    url: String,
  },
  { _id: false }
);

const ProjectDetailSchema = new Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      unique: true,
    },

    // ── Project Details ──────────────────────────────────────────────────────
    leadRefrance: { type: String },
    panelMake: { type: String },
    panelWp: { type: Number },
    noOfPanel: { type: Number },
    inverterMake: { type: String },
    inverterKw: { type: Number },
    inverterPhase: { type: String, enum: ["single", "three"] },
    installationRoof: { type: String, enum: ["rcc", "gi sheet", "rcc+gisheet"] },
    discom: { type: String, enum: ["dgvcl", "torrent"] },
    consumerConnectionType: { type: String, enum: ["single", "three"] },
    elcbInstalled: { type: String, enum: ["yes", "no"] },
    elcbProvideBy: { type: String, enum: ["greeneable", "sms", "customer"] },
    wiringType: { type: String, enum: ["open", "consild"] },
    homeFloor: { type: String },
    walkway: { type: String, enum: ["yes", "no"] },
    walkwayLengthFeet: { type: Number },
    ladder: { type: String, enum: ["yes", "no"] },
    ladderLengthFeet: { type: Number },
    hdgiPipeMake: { type: String },

    // HDGI Pipe sizes (in feet, 00 = acceptable)
    hdgiPipe80x40: { type: Number, default: 0 },
    hdgiPipe60x40: { type: Number, default: 0 },
    hdgiPipe40x40: { type: Number, default: 0 },
    hdgiPipe20x40PatiPipe: { type: Number, default: 0 },

    // ── Required Photos for Installation ────────────────────────────────────
    photoTerraceLayout: fileSchema,
    photoPanelLayout: fileSchema,
    photoSolarInstallation: fileSchema,
    photoInverterLocation: fileSchema,
    photoEarthingLocation: fileSchema,
    photoMeterBox: fileSchema,

    // ── Required Documents for Registration ─────────────────────────────────
    docLatestLightBill: fileSchema,
    docLatestTaxBill: fileSchema,
    docCancelCheck: fileSchema,
    docPanCard: fileSchema,
    docAadhaarCard: fileSchema,

    // ── Payment Details ──────────────────────────────────────────────────────
    paymentMode: { type: String, enum: ["cash", "cheque"] },
    projectAmount: { type: Number },
    subsidyLessProject: { type: String, enum: ["yes", "no"] },
    applyForLoan: { type: Boolean, default: false },

    // ── Required Documents for Loan ──────────────────────────────────────────
    loanDocQuotation: fileSchema,
    loanDocBankStatement: fileSchema,
    loanDocITRReturn: fileSchema,
    loanDocPanCard: fileSchema,
    loanDocAadhaarCard: fileSchema,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const ProjectDetail = mongoose.model("ProjectDetail", ProjectDetailSchema);
module.exports = ProjectDetail;
