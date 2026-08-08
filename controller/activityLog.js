const ActivityLog = require("../model/activityLog");

const fetchActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, module: moduleFilter, action: actionFilter, startDate, endDate } = req.query;

    const query = {};

    if (moduleFilter) {
      query.module = moduleFilter;
    }

    if (actionFilter) {
      query.action = actionFilter;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { userName: searchRegex },
        { userEmail: searchRegex },
        { entityName: searchRegex },
        { "details.message": searchRegex },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const totalLogs = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("performedBy", "name email");

    const totalPages = Math.ceil(totalLogs / limit);

    return res.status(200).json({
      status: "Success",
      data: logs,
      pagination: {
        totalLogs,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return res.status(500).json({
      status: "Fail",
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  fetchActivityLogs,
};
