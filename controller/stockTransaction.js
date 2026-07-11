const STOCK_TRANSACTION = require("../model/stockTransaction");
const PRODUCT = require("../model/product");

// Create a stock transaction (IN or OUT)
exports.createTransaction = async (req, res) => {
  try {
    const { categoryId, productId, type, quantity, note, unit } = req.body;

    if (!categoryId || !productId || !type || !quantity) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (type !== "IN" && type !== "OUT") {
      return res.status(400).json({ message: "Invalid transaction type" });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    const product = await PRODUCT.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (type === "OUT" && product.currentStock < quantity) {
      return res.status(400).json({ message: "Insufficient stock for this product" });
    }

    // Create the transaction
    const newTransaction = await STOCK_TRANSACTION.create({
      categoryId,
      productId,
      type,
      quantity,
      note,
      unit: unit || "Qty",
    });

    // Update product stock and unit
    if (type === "IN") {
      product.currentStock += quantity;
      if (unit) {
        product.unit = unit;
      }
    } else {
      product.currentStock -= quantity;
    }
    await product.save();

    res.status(201).json({
      message: `Stock ${type} created successfully`,
      data: newTransaction,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all transactions by type
exports.getAllTransactions = async (req, res) => {
  try {
    const { type } = req.query; // 'IN' or 'OUT'
    const query = {};
    if (type) {
      query.type = type;
    }

    const transactions = await STOCK_TRANSACTION.find(query)
      .populate("categoryId", "name")
      .populate("productId", "name currentStock")
      .populate("leadId", "fullName leadrefrance")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Transactions fetched successfully",
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { categoryId, productId, quantity, note, unit } = req.body;
    const { id } = req.params;

    const oldTransaction = await STOCK_TRANSACTION.findById(id);
    if (!oldTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const product = await PRODUCT.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Calculate the difference to adjust stock properly
    const difference = quantity - oldTransaction.quantity;

    if (oldTransaction.type === "OUT") {
      // If updating OUT, ensure the new quantity doesn't exceed currentStock + oldQuantity
      if (product.currentStock + oldTransaction.quantity < quantity) {
        return res.status(400).json({ message: "Insufficient stock for this update" });
      }
      product.currentStock -= difference;
    } else if (oldTransaction.type === "IN") {
      // If updating IN, ensure the new quantity doesn't drop currentStock below 0
      if (product.currentStock + difference < 0) {
        return res.status(400).json({ message: "This update would result in negative stock" });
      }
      product.currentStock += difference;
    }

    oldTransaction.categoryId = categoryId;
    oldTransaction.productId = productId;
    oldTransaction.quantity = quantity;
    oldTransaction.note = note;
    if (unit) {
      oldTransaction.unit = unit;
    }
    
    if (oldTransaction.type === "IN" && unit) {
      product.unit = unit;
    }

    await oldTransaction.save();
    await product.save();

    res.status(200).json({
      message: "Transaction updated successfully",
      data: oldTransaction,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await STOCK_TRANSACTION.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const product = await PRODUCT.findById(transaction.productId);
    
    if (product) {
      if (transaction.type === "IN") {
        if (product.currentStock < transaction.quantity) {
          return res.status(400).json({ message: "Cannot delete this stock IN as it is already consumed" });
        }
        product.currentStock -= transaction.quantity;
      } else if (transaction.type === "OUT") {
        product.currentStock += transaction.quantity;
      }
      await product.save();
    }

    await STOCK_TRANSACTION.findByIdAndDelete(id);

    res.status(200).json({
      message: "Transaction deleted successfully",
      data: transaction,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
