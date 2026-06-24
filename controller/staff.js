const STAFF = require("../model/staff");
const { encryptData, decryptData } = require("../utils/crypto");
const { deleteUploadedFile } = require("../utils/fileHelper");
const { uploadToExternalService, deleteFileFromExternalService } = require("../utils/externalUploader");
const jwt = require("jsonwebtoken");

exports.createStaff = async (req, res) => {
  let profileImage = null;
  try {
    const { fullName, email, phone, role, password, status } = req.body;

    const parseIds = (val) => {
      if (!val) return [];
      try { return JSON.parse(val); } catch { return Array.isArray(val) ? val : [val]; }
    };

    const encryptedPassword = encryptData(password);

    if (req.file) {
      profileImage = await uploadToExternalService(req.file, "StaffProfileImages");
    }

    const staffData = {
      profileImage,
      fullName,
      email,
      phone,
      role,
      status: status || "active",
      password: encryptedPassword,
      teams: parseIds(req.body.teams),
      organizations: parseIds(req.body.organizations),
    };

    const staffDetails = await STAFF.create(staffData);

    return res.status(201).json({
      status: "Success",
      message: "Staff created successfully",
      data: staffDetails,
    });
  } catch (error) {
    if (profileImage) {
      await deleteFileFromExternalService(profileImage).catch(console.error);
    } else if (req.file && req.file.filename) {
      deleteUploadedFile("images/StaffProfileImages", req.file.filename);
    }
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;
    let staffverify = await STAFF.findOne({ email }).populate("role").populate("teams").populate("organizations");
    
    if (staffverify) {
      if (staffverify.status !== "active") {
        throw new Error("Your account is inactive. Please contact the administrator.");
      }
      let decryptedPassword = decryptData(staffverify.password);
      if (String(decryptedPassword) !== password) {
        throw new Error("Invalid password");
      }
      let token = jwt.sign({ id: staffverify._id }, process.env.JWT_SECRET_KEY, { expiresIn: "24h" });
      return res.status(200).json({
        status: "Success",
        message: "Logged in successfully",
        data: staffverify,
        token,
      });
    }

    const USER = require("../model/user");
    let userverify = await USER.findOne({ email });
    if (userverify) {
      if (userverify.status !== "active") {
        throw new Error("Your account is inactive. Please contact the administrator.");
      }
      let decryptedPassword = decryptData(userverify.password);
      if (String(decryptedPassword) !== password) {
        throw new Error("Invalid password");
      }
      let token = jwt.sign({ id: userverify._id }, process.env.JWT_SECRET_KEY, { expiresIn: "24h" });
      return res.status(200).json({
        status: "Success",
        message: "Logged in successfully",
        data: userverify,
        token,
      });
    }

    throw new Error("Invalid Email or password");
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllStaffs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";

    const query = {
      $or: [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ],
    };

    const totalStaff = await STAFF.countDocuments(query);
    const staffsData = await STAFF.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("role")
      .populate("teams")
      .populate("organizations");

    return res.status(200).json({
      status: "Success",
      message: "Staffs fetched successfully",
      pagination: {
        totalRecords: totalStaff,
        currentPage: page,
        totalPages: Math.ceil(totalStaff / limit),
        limit,
      },
      data: staffsData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchStaffById = async (req, res) => {
  try {
    let staffId = req.params.id;
    let staffData = await STAFF.findById(staffId).populate("role").populate("teams").populate("organizations");
    if (!staffData) {
      throw new Error("Staff not found");
    }
    return res.status(200).json({
      status: "Success",
      message: "Staff fetched successfully",
      data: staffData,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getCurrentStaff = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: "Fail",
        message: "Unauthorized",
      });
    }

    return res.status(200).json({
      status: "Success",
      data: req.user,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.staffUpdate = async (req, res) => {
  try {
    let staffId = req.params.id;
    let oldStaff = await STAFF.findById(staffId);

    if (!oldStaff) {
      throw new Error("Staff not found");
    }

    const parseIds = (val) => {
      if (!val) return [];
      try { return JSON.parse(val); } catch { return Array.isArray(val) ? val : [val]; }
    };

    if (req.body.teams !== undefined) req.body.teams = parseIds(req.body.teams);
    if (req.body.organizations !== undefined) req.body.organizations = parseIds(req.body.organizations);

    if (req.body.password) {
      req.body.password = encryptData(req.body.password);
    }

    if (req.file) {
      if (oldStaff.profileImage && oldStaff.profileImage.startsWith('http')) {
        await deleteFileFromExternalService(oldStaff.profileImage).catch(console.error);
      } else if (oldStaff.profileImage) {
        deleteUploadedFile("images/StaffProfileImages", oldStaff.profileImage);
      }
      req.body.profileImage = await uploadToExternalService(req.file, "StaffProfileImages");
    }

    let updatedStaff = await STAFF.findByIdAndUpdate(staffId, req.body, {
      new: true,
    });
    return res.status(200).json({
      status: "Success",
      message: "Staff updated successfully",
      data: updatedStaff,
    });
  } catch (error) {
    if (req.file && req.body.profileImage && req.body.profileImage.startsWith('http')) {
      await deleteFileFromExternalService(req.body.profileImage).catch(console.error);
    } else if (req.file && req.file.filename) {
      deleteUploadedFile("images/StaffProfileImages", req.file.filename);
    }
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.staffDelete =  async (req, res) => {
  try {
    let staffId = req.params.id;
    let oldStaff = await STAFF.findById(staffId);

    if (!oldStaff) {
      throw new Error("Staff not found");
    }
    if (oldStaff.profileImage && oldStaff.profileImage.startsWith('http')) {
      await deleteFileFromExternalService(oldStaff.profileImage).catch(console.error);
    } else if (oldStaff.profileImage) {
      deleteUploadedFile("images/StaffProfileImages", oldStaff.profileImage);
    }
    await STAFF.findByIdAndDelete(staffId);

    return res.status(200).json({
      status: "Success",
      message: "Staff deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};
