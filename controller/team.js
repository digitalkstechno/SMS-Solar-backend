const Team = require("../model/team");

exports.createTeam = async (req, res) => {
  try {
    const team = await Team.create({ name: req.body.name });
    res.status(201).json({ status: "Success", message: "Team created successfully", data: team });
  } catch (error) {
    res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.fetchAllTeams = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const query = { name: { $regex: search, $options: "i" } };
    const total = await Team.countDocuments(query);
    const data = await Team.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });

    res.status(200).json({
      status: "Success",
      message: "Teams fetched successfully",
      pagination: { totalRecords: total, currentPage: page, totalPages: Math.ceil(total / limit), limit },
      data,
    });
  } catch (error) {
    res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
    if (!team) throw new Error("Team not found");
    res.status(200).json({ status: "Success", message: "Team updated successfully", data: team });
  } catch (error) {
    res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) throw new Error("Team not found");
    res.status(200).json({ status: "Success", message: "Team deleted successfully" });
  } catch (error) {
    res.status(400).json({ status: "Fail", message: error.message });
  }
};
