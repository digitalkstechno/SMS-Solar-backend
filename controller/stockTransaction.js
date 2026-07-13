const STOCK_TRANSACTION = require("../model/stockTransaction");
const PRODUCT = require("../model/product");
const ExcelJS = require("exceljs");

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
    const { type, from, to } = req.query; // 'IN' or 'OUT', dates
    const query = {};
    if (type) {
      query.type = type;
    }
    if (from || to) {
      query.createdAt = {};
      if (from) {
        const start = new Date(from);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
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
      // If updating IN, allow currentStock to adjust even if it temporarily goes negative
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

exports.exportStockInReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = { type: 'IN' };

    if (from || to) {
      query.createdAt = {};
      if (from) {
        const start = new Date(from);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const transactions = await STOCK_TRANSACTION.find(query)
      .populate("categoryId", "name")
      .populate("productId", "name currentStock")
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CRM System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Stock In Report", {
      pageSetup: { fitToPage: true, orientation: "landscape" },
    });

    sheet.columns = [
      { header: "S.No", key: "sno", width: 7 },
      { header: "Date", key: "date", width: 15 },
      { header: "Category", key: "category", width: 20 },
      { header: "Product Name", key: "productName", width: 30 },
      { header: "Added Quantity", key: "addedQty", width: 15 },
      { header: "Current Stock", key: "currentStock", width: 15 },
      { header: "Note", key: "note", width: 30 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F81BD" },
    };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    transactions.forEach((tx, index) => {
      const row = sheet.addRow({
        sno: index + 1,
        date: tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-IN") : "-",
        category: tx.categoryId?.name || "-",
        productName: tx.productId?.name || "-",
        addedQty: tx.quantity || 0,
        currentStock: tx.productId?.currentStock || 0,
        note: tx.note || "-",
      });
      row.alignment = { vertical: "middle", horizontal: "left" };
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="stock_in_report_${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
