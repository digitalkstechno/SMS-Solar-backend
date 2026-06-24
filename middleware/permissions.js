function getRolePermissions(role) {
  if (!role || !Array.isArray(role.permissions) || role.permissions.length === 0) {
    return {};
  }
  return role.permissions[0] || {};
}

function authorize(feature, action) {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !user.role) {
      return res.status(403).json({
        status: "Fail",
        message: "Access denied",
      });
    }

    const perms = getRolePermissions(user.role);
    if (user.role.roleName && user.role.roleName.toLowerCase() === "admin") {
      return next();
    }
    const featurePerms = perms[feature];

    if (feature === "lead" && action === "update") {
      if (featurePerms && featurePerms[action]) {
        return next();
      }

      if (featurePerms && featurePerms.readOwn) {
        const LEAD = require("../model/lead");
        return LEAD.findById(req.params.id)
          .then((leadData) => {
            if (!leadData) {
              return res.status(404).json({ status: "Fail", message: "Lead not found" });
            }
            const isAssigned = leadData.assignedTo && String(leadData.assignedTo) === String(user._id);
            const isCreator = leadData.createdBy && String(leadData.createdBy) === String(user._id);
            if (isAssigned || isCreator) {
              return next();
            }
            return res.status(403).json({ status: "Fail", message: "Access denied" });
          })
          .catch((err) => {
            return res.status(500).json({ status: "Fail", message: err.message });
          });
      }
    }

    if (!featurePerms || !featurePerms[action]) {
      return res.status(403).json({
        status: "Fail",
        message: "Access denied",
      });
    }

    next();
  };
}

function leadReadScope() {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !user.role) {
      return res.status(403).json({
        status: "Fail",
        message: "Access denied",
      });
    }

    const perms = getRolePermissions(user.role);
    const leadPerms = perms.lead || {};

    if (leadPerms.readAll) {
      req.leadScope = "all";
      return next();
    }

    if (leadPerms.readOwn) {
      req.leadScope = "own";
      return next();
    }

    return res.status(403).json({
      status: "Fail",
      message: "Access denied",
    });
  };
}

module.exports = {
  getRolePermissions,
  authorize,
  leadReadScope,
};

