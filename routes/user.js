var express = require("express");
var router = express.Router();
const createUploader = require("../utils/multer");
const upload = createUploader("images/UserProfileImages");

const authMiddleware = require("../middleware/auth");
const { authorize } = require("../middleware/permissions");
const { createUser, loginUser, fetchAllUsers, userDelete, userUpdate, fetchUserById, getCurrentUser } = require("../controller/user");

router.post("/add-user", upload.single("profileImage"), createUser);
router.post("/login", loginUser);

router.get("/me", authMiddleware, getCurrentUser);

router.get(
  "/",
  authMiddleware,
  authorize("setup", "readAll"),
  fetchAllUsers,
);
router.get(
  "/:id",
  authMiddleware,
  authorize("setup", "readAll"),
  fetchUserById,
);
router.put(
  "/:id",
  upload.single("profileImage"),
  authMiddleware,
  authorize("setup", "update"),
  userUpdate,
);
router.delete(
  "/:id",
  authMiddleware,
  authorize("setup", "delete"),
  userDelete,
);
module.exports = router;
