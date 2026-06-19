var express = require("express");
var router = express.Router();
const createUploader = require("../utils/multer");
const authMiddleware = require("../middleware/auth");
const { authorize } = require("../middleware/permissions");
const { upsertProjectDetail, getProjectDetail } = require("../controller/projectDetail");

// Allow multiple named file fields (photos + docs = 16 fields)
const upload = createUploader("images/ProjectDetail");

const fileFields = upload.fields([
  { name: "photoTerraceLayout", maxCount: 1 },
  { name: "photoPanelLayout", maxCount: 1 },
  { name: "photoSolarInstallation", maxCount: 1 },
  { name: "photoInverterLocation", maxCount: 1 },
  { name: "photoEarthingLocation", maxCount: 1 },
  { name: "photoMeterBox", maxCount: 1 },
  { name: "docLatestLightBill", maxCount: 1 },
  { name: "docLatestTaxBill", maxCount: 1 },
  { name: "docCancelCheck", maxCount: 1 },
  { name: "docPanCard", maxCount: 1 },
  { name: "docAadhaarCard", maxCount: 1 },
  { name: "loanDocQuotation", maxCount: 1 },
  { name: "loanDocBankStatement", maxCount: 1 },
  { name: "loanDocITRReturn", maxCount: 1 },
  { name: "loanDocPanCard", maxCount: 1 },
  { name: "loanDocAadhaarCard", maxCount: 1 },
]);

// Flatten req.files from { fieldname: [file] } to array for controller
const flattenFiles = (req, res, next) => {
  if (req.files && !Array.isArray(req.files)) {
    const flat = [];
    Object.entries(req.files).forEach(([fieldname, arr]) => {
      arr.forEach((f) => { f.fieldname = fieldname; flat.push(f); });
    });
    req.files = flat;
  }
  next();
};

// POST /v1/api/project-detail/:leadId  – create or update
router.post(
  "/:leadId",
  authMiddleware,
  authorize("lead", "update"),
  fileFields,
  flattenFiles,
  upsertProjectDetail
);

// GET /v1/api/project-detail/:leadId  – fetch
router.get("/:leadId", authMiddleware, getProjectDetail);

module.exports = router;
