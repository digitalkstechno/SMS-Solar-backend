const LEADLABEL = require("../model/leadLabel");

// Create new lead label
exports.createLeadLabel = async (req, res) => {
  try {
    const { name, color, order } = req.body;

    // Check if label with same name already exists
    const existingLabel = await LEADLABEL.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingLabel) {
      return res.status(400).json({
        status: "Fail",
        message: "Lead label with this name already exists"
      });
    }

    const newLeadLabel = await LEADLABEL.create({
      name,
      color,
      order: order || null
    });

    res.status(201).json({
      status: "Success",
      message: "Lead label created successfully",
      data: newLeadLabel,
    });
  } catch (error) {
    res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

// Fetch all lead labels with pagination and search
exports.fetchAllLeadLabels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // Build search query
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { color: { $regex: search, $options: "i" } }
          ],
        }
      : {};

    const totalLabels = await LEADLABEL.countDocuments(query);
    const labelsData = await LEADLABEL.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ order: 1, createdAt: -1 }); // Sort by order first, then by creation date

    return res.status(200).json({
      status: "Success",
      message: "Lead labels fetched successfully",
      pagination: {
        totalRecords: totalLabels,
        currentPage: page,
        totalPages: Math.ceil(totalLabels / limit),
        limit,
      },
      data: labelsData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

// Fetch single lead label by ID
exports.fetchLeadLabelById = async (req, res) => {
  try {
    const labelId = req.params.id;
    const labelData = await LEADLABEL.findById(labelId);

    if (!labelData) {
      return res.status(404).json({
        status: "Fail",
        message: "Lead label not found",
      });
    }

    return res.status(200).json({
      status: "Success",
      message: "Lead label fetched successfully",
      data: labelData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

// Update lead label
exports.updateLeadLabel = async (req, res) => {
  try {
    const labelId = req.params.id;
    const { name, color, order } = req.body;

    // Check if label exists
    const existingLabel = await LEADLABEL.findById(labelId);
    if (!existingLabel) {
      return res.status(404).json({
        status: "Fail",
        message: "Lead label not found",
      });
    }

    // If name is being updated, check for duplicates
    if (name && name.toLowerCase() !== existingLabel.name.toLowerCase()) {
      const duplicateLabel = await LEADLABEL.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: labelId }
      });
      
      if (duplicateLabel) {
        return res.status(400).json({
          status: "Fail",
          message: "Lead label with this name already exists"
        });
      }
    }

    // Update the label
    const updatedLabel = await LEADLABEL.findByIdAndUpdate(
      labelId,
      {
        name: name || existingLabel.name,
        color: color || existingLabel.color,
        order: order !== undefined ? order : existingLabel.order,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      status: "Success",
      message: "Lead label updated successfully",
      data: updatedLabel,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

// Delete lead label
exports.deleteLeadLabel = async (req, res) => {
  try {
    const labelId = req.params.id;

    // Check if label exists
    const existingLabel = await LEADLABEL.findById(labelId);
    if (!existingLabel) {
      return res.status(404).json({
        status: "Fail",
        message: "Lead label not found",
      });
    }

    // Optional: Check if label is being used by any leads
    // You might want to add this check if you have a leads collection
    // const leadsUsingLabel = await LEAD.countDocuments({ label: labelId });
    // if (leadsUsingLabel > 0) {
    //   return res.status(400).json({
    //     status: "Fail",
    //     message: "Cannot delete label as it is being used by leads",
    //   });
    // }

    await LEADLABEL.findByIdAndDelete(labelId);

    return res.status(200).json({
      status: "Success",
      message: "Lead label deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

// Bulk update order of labels
exports.updateLabelOrder = async (req, res) => {
  try {
    const { labels } = req.body; // Expecting array of { id, order }

    if (!Array.isArray(labels)) {
      return res.status(400).json({
        status: "Fail",
        message: "Labels must be an array",
      });
    }

    // Update each label's order
    const updatePromises = labels.map(({ id, order }) => 
      LEADLABEL.findByIdAndUpdate(id, { order }, { new: true })
    );

    const updatedLabels = await Promise.all(updatePromises);

    return res.status(200).json({
      status: "Success",
      message: "Label order updated successfully",
      data: updatedLabels,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};