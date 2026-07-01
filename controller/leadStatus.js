const LEADSTATUS = require("../model/leadStatus");

exports.createLeadStatus = async (req, res) => {
  try {
    let leadStatusCreate = req.body;
    
    // Check for duplicates
    const existingName = await LEADSTATUS.findOne({ name: { $regex: new RegExp(`^${leadStatusCreate.name}$`, 'i') } });
    if (existingName) {
      return res.status(400).json({
        status: "Fail",
        message: "A lead status with this name already exists",
      });
    }

    if (leadStatusCreate.order !== undefined) {
      const existingOrder = await LEADSTATUS.findOne({ order: leadStatusCreate.order });
      if (existingOrder) {
        return res.status(400).json({
          status: "Fail",
          message: "A lead status with this order already exists",
        });
      }
    }

    let newLeadStatus = await LEADSTATUS.create(leadStatusCreate);
    res.status(201).json({
      status: "Success",
      data: newLeadStatus,
    });
  } catch (error) {
    res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllLeadStatus = async (req, res) => {
  try {
    const search = req.query.search || "";

    const query = {
      $or: [{ name: { $regex: search, $options: "i" } }],
    };

    // check if pagination params exist
    const hasPagination = req.query.page || req.query.limit;

    if (hasPagination) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const totalStatus = await LEADSTATUS.countDocuments(query);

      const StatusData = await LEADSTATUS.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ order: 1 });

      return res.status(200).json({
        status: "Success",
        message: "Leads Status fetched successfully",
        pagination: {
          totalRecords: totalStatus,
          currentPage: page,
          totalPages: Math.ceil(totalStatus / limit),
          limit,
        },
        data: StatusData,
      });
    } else {
      // 👉 No pagination → return all data
      const StatusData = await LEADSTATUS.find(query).sort({ order: 1 });

      return res.status(200).json({
        status: "Success",
        message: "All Leads Status fetched successfully",
        data: StatusData,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchLeadStatusById = async (req, res) => {
  try {
    let StatusId = req.params.id;
    let StatusData = await LEADSTATUS.findById(StatusId);
    if (!StatusData) {
      throw new Error("Lead Status not found");
    }
    return res.status(200).json({
      status: "Success",
      message: "Lead Status fetched successfully",
      data: StatusData,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.LeadStatusUpdate = async (req, res) => {
  try {
    let StatusId = req.params.id;
    let oldLeadStatus = await LEADSTATUS.findById(StatusId);
    if (!oldLeadStatus) {
      throw new Error("Lead Status not found");
    }

    if (req.body.name && req.body.name.toLowerCase() !== oldLeadStatus.name.toLowerCase()) {
      const existing = await LEADSTATUS.findOne({ name: { $regex: new RegExp(`^${req.body.name}$`, 'i') } });
      if (existing) {
        return res.status(400).json({
          status: "Fail",
          message: "A lead status with this name already exists",
        });
      }
    }

    if (req.body.order !== undefined && req.body.order !== oldLeadStatus.order) {
      const existingOrder = await LEADSTATUS.findOne({ order: req.body.order });
      if (existingOrder) {
        return res.status(400).json({
          status: "Fail",
          message: "A lead status with this order already exists",
        });
      }
    }

    let updatedStatus = await LEADSTATUS.findByIdAndUpdate(StatusId, req.body, {
      new: true,
    });
    return res.status(200).json({
      status: "Success",
      message: "Lead Status updated successfully",
      data: updatedStatus,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.LeadStatusDelete = async (req, res) => {
  try {
    let StatusId = req.params.id;
    let oldLeadStatus = await LEADSTATUS.findById(StatusId);

    if (!oldLeadStatus) {
      throw new Error("Lead Status not found");
    }
    await LEADSTATUS.findByIdAndDelete(StatusId);

    return res.status(200).json({
      status: "Success",
      message: "Lead Status deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.setupDefaultLeadStatuses = async () => {
  try {
    const defaultStatuses = [
      { name: "New Lead", order: 1 },
      { name: "Won", order: 2 },
      { name: "Lost", order: 3 },
    ];

    for (const status of defaultStatuses) {
      const existingStatus = await LEADSTATUS.findOne({ name: status.name });
      if (!existingStatus) {
        await LEADSTATUS.create(status);
      }
    }
  } catch (error) {
    console.error("Error setting up default lead statuses:", error);
  }
};