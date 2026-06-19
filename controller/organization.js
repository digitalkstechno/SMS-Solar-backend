const Organization = require("../model/organization");

exports.createOrganization = async (req, res) => {
  try {
    const org = await Organization.create({ name: req.body.name });
    res.status(201).json({ status: "Success", message: "Organization created successfully", data: org });
  } catch (error) {
    res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.fetchAllOrganizations = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const query = { name: { $regex: search, $options: "i" } };
    const total = await Organization.countDocuments(query);
    const data = await Organization.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });

    res.status(200).json({
      status: "Success",
      message: "Organizations fetched successfully",
      pagination: { totalRecords: total, currentPage: page, totalPages: Math.ceil(total / limit), limit },
      data,
    });
  } catch (error) {
    res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.updateOrganization = async (req, res) => {
  try {
    const org = await Organization.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
    if (!org) throw new Error("Organization not found");
    res.status(200).json({ status: "Success", message: "Organization updated successfully", data: org });
  } catch (error) {
    res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.deleteOrganization = async (req, res) => {
  try {
    const org = await Organization.findByIdAndDelete(req.params.id);
    if (!org) throw new Error("Organization not found");
    res.status(200).json({ status: "Success", message: "Organization deleted successfully" });
  } catch (error) {
    res.status(400).json({ status: "Fail", message: error.message });
  }
};
