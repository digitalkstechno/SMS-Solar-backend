var express = require("express");
var router = express.Router();

router.use("/health", require("./health"));
router.use("/staff", require("./staff"));
router.use("/role", require("./role"));
router.use("/leadsources", require("./leadSources"));
router.use("/leadstatus", require("./leadStatus"));
router.use("/taskstatus", require("./taskStatus"));
router.use("/lead", require("./lead"));
router.use("/meta-webhook", require("./metaLead"));
router.use("/meta", require("./meta"));
router.use("/leadlabel", require("./leadLabel"));
router.use("/team", require("./team"));
router.use("/organization", require("./organization"));
router.use("/task", require("./task"));
router.use("/notification", require("./notification"));
router.use("/category", require("./category"));
router.use("/product", require("./product"));
router.use("/stock", require("./stockTransaction"));
router.use("/users", require("./user"));
router.use("/project-detail", require("./projectDetail"));

module.exports = router;
