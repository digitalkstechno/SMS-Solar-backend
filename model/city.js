let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let CitySchema = new Schema(
  {
    cityName: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      required: true,
      default: "active",
      enum: ["active", "inactive"],
    },
  },
  { timestamps: true }
);

let CITY = mongoose.model("City", CitySchema);
module.exports = CITY;
