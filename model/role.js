let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let RoleSchema = new Schema(
  {
    roleName: {
      type: String,
      required: true,
      unique: true,
    },
    permissions: [
      {
        setup: {
          create: { type: Boolean, default: false },
          readAll: { type: Boolean, default: false },
          update: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
        },
        lead: {
          create: { type: Boolean, default: false },
          readOwn: { type: Boolean, default: false },
          readAll: { type: Boolean, default: false },
          update: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
        },
        task: {
          create: { type: Boolean, default: false },
          readOwn: { type: Boolean, default: false },
          readAll: { type: Boolean, default: false },
          update: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
        },
        taskStatus: {
          create: { type: Boolean, default: false },
          readOwn: { type: Boolean, default: false },
          readAll: { type: Boolean, default: false },
          update: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
        },
        staff: {
          create: { type: Boolean, default: false },
          readOwn: { type: Boolean, default: false },
          readAll: { type: Boolean, default: false },
          update: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
        },
        role: {
          create: { type: Boolean, default: false },
          readOwn: { type: Boolean, default: false },
          readAll: { type: Boolean, default: false },
          update: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
        },
        leadStatus: {
          create: { type: Boolean, default: false },
          readOwn: { type: Boolean, default: false },
          readAll: { type: Boolean, default: false },
          update: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
        },
        leadSource: {
          create: { type: Boolean, default: false },
          readOwn: { type: Boolean, default: false },
          readAll: { type: Boolean, default: false },
          update: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
        },
        leadLabel: {
          create: { type: Boolean, default: false },
          readOwn: { type: Boolean, default: false },
          readAll: { type: Boolean, default: false },
          update: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
        },
        teams: {
          create: { type: Boolean, default: false },
          readOwn: { type: Boolean, default: false },
          readAll: { type: Boolean, default: false },
          update: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
        },
        organizations: {
          create: { type: Boolean, default: false },
          readOwn: { type: Boolean, default: false },
          readAll: { type: Boolean, default: false },
          update: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
        },
      },
    ],
  },
  { timestamps: true },
);

let ROLE = mongoose.model("Role", RoleSchema);
module.exports = ROLE;
