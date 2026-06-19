const ROLE = require("../model/role");

exports.createRole = async (req, res, next) => {
  try {
    let roleDetails = req.body;
    let newRole = await ROLE.create(roleDetails);
    res.status(201).json({
      status: "Success",
      data: newRole,
    });
  } catch (error) {
    res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllRoles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";

    const query = {
      $or: [{ roleName: { $regex: search, $options: "i" } }],
    };

    const totalRoles = await ROLE.countDocuments(query);
    const rolesData = await ROLE.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: "Success",
      message: "Roles fetched successfully",
      pagination: {
        totalRecords: totalRoles,
        currentPage: page,
        totalPages: Math.ceil(totalRoles / limit),
        limit,
      },
      data: rolesData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchRoleById = async (req, res) => {
  try {
    let roleId = req.params.id;
    let roleData = await ROLE.findById(roleId);
    if (!roleData) {
      throw new Error("Role not found");
    }
    return res.status(200).json({
      status: "Success",
      message: "Role fetched successfully",
      data: roleData,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.roleUpdate = async (req, res) => {
  try {
    let roleId = req.params.id;
    let oldRole = await ROLE.findById(roleId);
    if (!oldRole) {
      throw new Error("Role not found");
    }
    let updatedRole = await ROLE.findByIdAndUpdate(roleId, req.body, {
      new: true,
    });
    return res.status(200).json({
      status: "Success",
      message: "Role updated successfully",
      data: updatedRole,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.roleDelete = async (req, res) => {
  try {
    let roleId = req.params.id;
    let oldRole = await ROLE.findById(roleId);

    if (!oldRole) {
      throw new Error("Role not found");
    }
    await ROLE.findByIdAndDelete(roleId);

    return res.status(200).json({
      status: "Success",
      message: "Role deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};
