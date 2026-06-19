let mongoose = require("mongoose");

let Schema = mongoose.Schema;

let StaffSchema = new Schema(
  {
    profileImage: {
      type: String,
    },
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "active",
    },
    teams: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    }],
    organizations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
    }],
  },
  { timestamps: true },
);

let STAFF = mongoose.model("Staff", StaffSchema);
module.exports = STAFF;
