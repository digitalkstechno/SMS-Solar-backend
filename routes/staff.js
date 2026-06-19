var express = require("express");
var router = express.Router();
const createUploader = require("../utils/multer");
const upload = createUploader("images/StaffProfileImages");
let {
  createStaff,
  loginStaff,
  fetchAllStaffs,
  fetchStaffById,
  staffUpdate,
  staffDelete,
  getCurrentStaff,
} = require("../controller/staff");
const authMiddleware = require("../middleware/auth");
const { authorize } = require("../middleware/permissions");

router.post("/create", upload.single("profileImage"), createStaff);
router.post("/login", loginStaff);
router.get("/me", authMiddleware, getCurrentStaff);
router.get(
  "/",
  authMiddleware,
  authorize("setup", "readAll"),
  fetchAllStaffs,
);
router.get(
  "/:id",
  authMiddleware,
  authorize("setup", "readAll"),
  fetchStaffById,
);
router.put(
  "/:id",
  upload.single("profileImage"),
  authMiddleware,
  authorize("setup", "update"),
  staffUpdate,
);
router.delete(
  "/:id",
  authMiddleware,
  authorize("setup", "delete"),
  staffDelete,
);
module.exports = router;
