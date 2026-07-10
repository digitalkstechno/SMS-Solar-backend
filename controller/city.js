const CITY = require("../model/city");

exports.createCity = async (req, res) => {
  try {
    // Attempt to drop legacy index that causes duplicate null errors
    await CITY.collection.dropIndex('name_1').catch(e => {});

    const { cityName, status } = req.body;
    if (!cityName) throw new Error("City name is required");
    
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let existing = await CITY.findOne({ cityName: { $regex: new RegExp(`^${escapeRegex(cityName)}$`, "i") } });
    if (existing) {
      throw new Error("City already exists");
    }

    const cityData = {
      cityName,
      status: status || "active",
    };

    const CityDetails = await CITY.create(cityData);
    return res.status(201).json({
      status: "Success",
      message: "City created successfully",
      data: CityDetails,
    });
  } catch (error) {
    return res.status(400).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getAllCities = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.cityName = { $regex: search, $options: "i" };
    }

    // Determine if pagination is requested. If limit is explicitly large, maybe they want all.
    // If we want all cities without pagination (like for dropdowns), we might check query.all = true
    if (req.query.all === "true") {
      const citiesData = await CITY.find(query).sort({ createdAt: -1 });
      return res.status(200).json({
        status: "Success",
        message: "Cities fetched successfully",
        data: citiesData,
      });
    }

    const totalCities = await CITY.countDocuments(query);
    const citiesData = await CITY.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: "Success",
      message: "Cities fetched successfully",
      pagination: {
        totalRecords: totalCities,
        currentPage: page,
        totalPages: Math.ceil(totalCities / limit),
        limit,
      },
      data: citiesData,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getCityById = async (req, res) => {
  try {
    let cityId = req.params.id;
    let cityData = await CITY.findById(cityId);
    if (!cityData) {
      throw new Error("City not found");
    }
    return res.status(200).json({
      status: "Success",
      message: "City fetched successfully",
      data: cityData,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.updateCity = async (req, res) => {
  try {
    let cityId = req.params.id;
    let oldCity = await CITY.findById(cityId);
    if (!oldCity) {
      throw new Error("City not found");
    }
    
    if (req.body.cityName && req.body.cityName.toLowerCase() !== oldCity.cityName.toLowerCase()) {
      const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let existing = await CITY.findOne({ cityName: { $regex: new RegExp(`^${escapeRegex(req.body.cityName)}$`, "i") } });
      if (existing) {
        throw new Error("City already exists");
      }
    }

    let updatedCity = await CITY.findByIdAndUpdate(cityId, req.body, { new: true });
    return res.status(200).json({
      status: "Success",
      message: "City updated successfully",
      data: updatedCity,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.deleteCity = async (req, res) => {
  try {
    let cityId = req.params.id;
    let oldCity = await CITY.findById(cityId);
    if (!oldCity) {
      throw new Error("City not found");
    }
    await CITY.findByIdAndDelete(cityId);
    return res.status(200).json({
      status: "Success",
      message: "City deleted successfully",
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};
