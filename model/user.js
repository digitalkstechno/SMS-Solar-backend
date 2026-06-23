let mongoose = require("mongoose");

let Schema = mongoose.Schema;

let UserSchema = new Schema(
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
    status: {
      type: String,
      required: true,
      default: "active",
    },
    department: {
      type: String,
    },
    city: {
      type: String,
    },

  },
  { timestamps: true },
);

let USER = mongoose.model("User", UserSchema);
module.exports = USER;
