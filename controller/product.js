const PRODUCT = require("../model/product");

exports.createProduct = async (req, res) => {
  try {
    const { categoryId, name } = req.body;
    if (!categoryId || !name) {
      return res.status(400).json({ message: "Category and Product name are required" });
    }

    const newProduct = await PRODUCT.create({ categoryId, name });
    res.status(201).json({
      message: "Product created successfully",
      data: newProduct,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await PRODUCT.find()
      .populate("categoryId", "name")
      .sort({ createdAt: -1 });
      
    res.status(200).json({
      message: "Products fetched successfully",
      data: products,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await PRODUCT.findById(id).populate("categoryId", "name");
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    res.status(200).json({
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, name } = req.body;
    
    if (!categoryId || !name) {
      return res.status(400).json({ message: "Category and Product name are required" });
    }

    const product = await PRODUCT.findByIdAndUpdate(
      id,
      { categoryId, name },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await PRODUCT.findByIdAndDelete(id);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: "Product deleted successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
