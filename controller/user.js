const USER = require("../model/user");
const Role = require("../model/role");
const { encryptData, decryptData } = require("../utils/crypto");
const { deleteUploadedFile } = require("../utils/fileHelper");
const { uploadToExternalService, deleteFileFromExternalService } = require("../utils/externalUploader");
const jwt = require("jsonwebtoken");

exports.createUser = async (req, res) => {
  let profileImage = null;
  try {
    const { fullName, email, phone, password, department, status, city } = req.body;

    const encryptedPassword = encryptData(password);

    if (req.file) {
      profileImage = await uploadToExternalService(req.file, "UserProfileImages");
    }

    const userData = {
      profileImage: profileImage,
      fullName,
      email,
      phone,
      password: encryptedPassword,
      status: status || "active",
      department: department,
      city: city,
    };

    const UserDetails = await USER.create(userData);

    return res.status(201).json({
      status: "Success",
      message: "User created successfully",
      data: UserDetails,
    });
  } catch (error) {
    if (profileImage) {
      await deleteFileFromExternalService(profileImage).catch(console.error);
    }
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    let userverify = await USER.findOne({ email });
    if (!userverify) {
      throw new Error("Invalid Email or password");
    }
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
      message: "User logged in successfully",
      data: userverify,
      token,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const roleName = req.query.roleName || "";
    const city = req.query.city || "";

    const query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    let roleIds = [];
    if (roleName) {
      const ROLE = require("../model/role");
      const roles = await ROLE.find({ roleName: { $regex: roleName, $options: "i" } });
      roleIds = roles.map(r => r._id.toString());
      if (roleIds.length > 0) {
        query.department = { $in: roleIds };
      }
    }

    if (city) {
      const CITY = require("../model/city");
      const cities = await CITY.find({ cityName: { $regex: city, $options: "i" } });
      const cityIds = cities.map(c => c._id.toString());
      if (cityIds.length > 0) {
        query.city = { $in: cityIds };
      }
    }

    const totalUsers = await USER.countDocuments(query);
    const usersData = await USER.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const ROLE = require("../model/role");
    const roles = await ROLE.find({});
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role._id.toString()] = role.roleName;
    });

    const CITY = require("../model/city");
    const allCities = await CITY.find({});
    const cityMap = {};
    allCities.forEach(c => {
      cityMap[c._id.toString()] = c.cityName;
    });

    const populatedUsersData = usersData.map(user => {
      const userObj = user.toObject();
      if (userObj.department && roleMap[userObj.department]) {
        userObj.departmentName = roleMap[userObj.department];
      } else {
        userObj.departmentName = null;
      }

      if (userObj.city && Array.isArray(userObj.city)) {
        const uniqueNames = [...new Set(userObj.city.map(cId => {
          let name = cityMap[cId] || cId;
          return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        }))];
        userObj.cityNames = uniqueNames.join(", ");
      } else if (userObj.city && typeof userObj.city === 'string') {
        let name = cityMap[userObj.city] || userObj.city;
        userObj.cityNames = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      } else {
        userObj.cityNames = "-";
      }

      return userObj;
    });

    return res.status(200).json({
      status: "Success",
      message: "Users fetched successfully",
      pagination: {
        totalRecords: totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        limit,
      },
      data: populatedUsersData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchUserById = async (req, res) => {
  try {
    let userId = req.params.id;
    let userData = await USER.findById(userId);
    if (!userData) {
      throw new Error("User not found");
    }

    const ROLE = require("../model/role");
    let departmentName = null;
    if (userData.department) {
      const role = await ROLE.findById(userData.department);
      if (role) {
        departmentName = role.roleName;
      }
    }

    const userObj = userData.toObject();
    userObj.departmentName = departmentName;

    return res.status(200).json({
      status: "Success",
      message: "User fetched successfully",
      data: userObj,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getCurrentUser = async (req, res) => {
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

exports.userUpdate = async (req, res) => {
  try {
    let userID = req.params.id;
    let oldUser = await USER.findById(userID);

    if (!oldUser) {
      throw new Error("User not found");
    }

    if (req.body.password) {
      req.body.password = encryptData(req.body.password);
    }

    if (req.file) {
      if (oldUser.profileImage && oldUser.profileImage.startsWith('http')) {
        await deleteFileFromExternalService(oldUser.profileImage).catch(console.error);
      } else if (oldUser.profileImage) {
        deleteUploadedFile("images/UserProfileImages", oldUser.profileImage);
      }
      req.body.profileImage = await uploadToExternalService(req.file, "UserProfileImages");
    }

    let updatedUser = await USER.findByIdAndUpdate(userID, req.body, {
      new: true,
    });
    return res.status(200).json({
      status: "Success",
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    if (req.file && req.body.profileImage && req.body.profileImage.startsWith('http')) {
      await deleteFileFromExternalService(req.body.profileImage).catch(console.error);
    } else if (req.file && req.file.filename) {
      deleteUploadedFile("images/UserProfileImages", req.file.filename);
    }
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.userDelete = async (req, res) => {
  try {
    let userID = req.params.id;
    let oldUser = await USER.findById(userID);

    if (!oldUser) {
      throw new Error("User not found");
    }
    if (oldUser.profileImage && oldUser.profileImage.startsWith('http')) {
      await deleteFileFromExternalService(oldUser.profileImage).catch(console.error);
    } else if (oldUser.profileImage) {
      deleteUploadedFile("images/UserProfileImages", oldUser.profileImage);
    }
    await USER.findByIdAndDelete(userID);

    return res.status(200).json({
      status: "Success",
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchSalesExecutives = async (req, res) => {
  try {
    const search = req.query.search || "";
    const city = req.query.city || "";

    const query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (city) {
      const CITY = require("../model/city");
      const cities = await CITY.find({ cityName: { $regex: city, $options: "i" } });
      const cityIds = cities.map(c => c._id.toString());
      if (cityIds.length > 0) {
        query.city = { $in: cityIds };
      }
    }

    const salesRole = await Role.findOne({ roleName: { $regex: 'sales', $options: 'i' } });
    if (salesRole) {
      query.department = salesRole._id;
    }

    const usersData = await USER.find(query).sort({ createdAt: -1 });

    const ROLE = require("../model/role");
    const roles = await ROLE.find({});
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role._id.toString()] = role.roleName;
    });

    const CITY = require("../model/city");
    const allCities = await CITY.find({});
    const cityMap = {};
    allCities.forEach(c => {
      cityMap[c._id.toString()] = c.cityName;
    });

    const populatedUsersData = usersData.map(user => {
      const userObj = user.toObject();
      if (userObj.department && roleMap[userObj.department]) {
        userObj.departmentName = roleMap[userObj.department];
      } else {
        userObj.departmentName = null;
      }

      if (userObj.city && Array.isArray(userObj.city)) {
        const uniqueNames = [...new Set(userObj.city.map(cId => {
          let name = cityMap[cId] || cId;
          return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        }))];
        userObj.cityNames = uniqueNames.join(", ");
      } else if (userObj.city && typeof userObj.city === 'string') {
        let name = cityMap[userObj.city] || userObj.city;
        userObj.cityNames = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      } else {
        userObj.cityNames = "-";
      }

      return userObj;
    });

    return res.status(200).json({
      status: "Success",
      message: "Users fetched successfully",
      data: populatedUsersData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};
