const CATEGORY = require("../model/category");

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const existingCategory = await CATEGORY.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });
    if (existingCategory) {
      return res.status(400).json({ message: "Category with this name already exists" });
    }

    const newCategory = await CATEGORY.create({ name });
    res.status(201).json({
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    let query = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (page && limit) {
      const pageNumber = parseInt(page) || 1;
      const pageSize = parseInt(limit) || 10;
      const skip = (pageNumber - 1) * pageSize;

      const [categories, total] = await Promise.all([
        CATEGORY.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
        CATEGORY.countDocuments(query)
      ]);

      return res.status(200).json({
        message: "Categories fetched successfully",
        data: categories,
        pagination: {
          totalRecords: total,
          currentPage: pageNumber,
          totalPages: Math.ceil(total / pageSize)
        }
      });
    }

    // Fallback to all if no pagination provided
    const categories = await CATEGORY.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await CATEGORY.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json({
      message: "Category fetched successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const existingCategory = await CATEGORY.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      _id: { $ne: id }
    });
    if (existingCategory) {
      return res.status(400).json({ message: "Category with this name already exists" });
    }

    const category = await CATEGORY.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await CATEGORY.findByIdAndDelete(id);
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category deleted successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
