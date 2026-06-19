const LEADSOURCES = require("../model/leadSources");

exports.createLeadSources = async (req, res) => {
  try {
    let leadSourceCreate = req.body;
    let newLeadSource = await LEADSOURCES.create(leadSourceCreate);
    res.status(201).json({
      status: "Success",
      data: newLeadSource,
    });
  } catch (error) {
    res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchAllLeadSources = async (req, res) => {
  try {
    const search = req.query.search || "";

    const query = {
      $or: [{ name: { $regex: search, $options: "i" } }],
    };

    // check pagination मौजूद है या नहीं
    const hasPagination = req.query.page || req.query.limit;

    if (hasPagination) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const totalSources = await LEADSOURCES.countDocuments(query);

      const SourcesData = await LEADSOURCES.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      return res.status(200).json({
        status: "Success",
        message: "Leads fetched successfully",
        pagination: {
          totalRecords: totalSources,
          currentPage: page,
          totalPages: Math.ceil(totalSources / limit),
          limit,
        },
        data: SourcesData,
      });
    } else {
      // 👉 no pagination → all data
      const SourcesData = await LEADSOURCES.find(query)
        .sort({ createdAt: -1 });

      return res.status(200).json({
        status: "Success",
        message: "All Leads fetched successfully",
        data: SourcesData,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.fetchLeadSourcesById = async (req, res) => {
  try {
    let sourceId = req.params.id;
    let sourceData = await LEADSOURCES.findById(sourceId);
    if (!sourceData) {
      throw new Error("Lead Source not found");
    }
    return res.status(200).json({
      status: "Success",
      message: "Lead Source fetched successfully",
      data: sourceData,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.LeadSourceUpdate = async (req, res) => {
  try {
    let sourceId = req.params.id;
    let oldLeadSource = await LEADSOURCES.findById(sourceId);
    if (!oldLeadSource) {
      throw new Error("Lead Source not found");
    }
    let updatedSources = await LEADSOURCES.findByIdAndUpdate(sourceId, req.body, {
      new: true,
    });
    return res.status(200).json({
      status: "Success",
      message: "Lead Source updated successfully",
      data: updatedSources,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.LeadSourcesDelete = async (req, res) => {
  try {
    let sourceId = req.params.id;
    let oldLeadSource = await LEADSOURCES.findById(sourceId);

    if (!oldLeadSource) {
      throw new Error("Lead Source not found");
    }
    await LEADSOURCES.findByIdAndDelete(sourceId);

    return res.status(200).json({
      status: "Success",
      message: "Lead Source deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};
