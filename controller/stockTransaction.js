const STOCK_TRANSACTION = require("../model/stockTransaction");
const PRODUCT = require("../model/product");
const ExcelJS = require("exceljs");

// Create a stock transaction (IN or OUT)
exports.createTransaction = async (req, res) => {
  try {
    const { categoryId, productId, type, quantity, note, unit } = req.body;

    if (!categoryId || !productId || !type || !quantity || !note || !String(note).trim()) {
      return res.status(400).json({ message: "Missing required fields (Note is required)" });
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

    const newTransaction = await STOCK_TRANSACTION.create({
      categoryId,
      productId,
      type,
      quantity,
      note,
      unit: unit || "Qty",
    });

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

    if (!note || !String(note).trim()) {
      return res.status(400).json({ message: "Note is required" });
    }

    const oldTransaction = await STOCK_TRANSACTION.findById(id);
    if (!oldTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const product = await PRODUCT.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const difference = quantity - oldTransaction.quantity;

    if (oldTransaction.type === "OUT") {
      if (product.currentStock + oldTransaction.quantity < quantity) {
        return res.status(400).json({ message: "Insufficient stock for this update" });
      }
      product.currentStock -= difference;
    } else if (oldTransaction.type === "IN") {
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

exports.exportStockTransactions = async (req, res) => {
  try {
    const { from, to, type = 'IN', categoryId, productId, search } = req.query;
    const query = {};
    if (type) {
      query.type = type;
    }
    if (categoryId) {
      query.categoryId = categoryId;
    }
    if (productId) {
      query.productId = productId;
    }
    if (search?.trim()) {
      const matchingProducts = await PRODUCT.find({
        name: { $regex: search.trim(), $options: "i" },
      }).select("_id");
      query.productId = { $in: matchingProducts.map((product) => product._id) };
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
      .populate("productId", "name currentStock unit")
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CRM System";
    workbook.created = new Date();

    const reportTitle = type === 'OUT' ? 'Stock Out Report' : 'Stock In Report';
    const sheet = workbook.addWorksheet(reportTitle, {
      pageSetup: { fitToPage: true, orientation: "landscape" },
      views: [{ state: "frozen", ySplit: 4 }],
    });

    const TOTAL_COLS = 9;
    const THEME = "FFA63C71";
    const THEME_LIGHT = "FFF5E9F1";
    const WHITE = "FFFFFFFF";
    const DARK = "FF2D2D2D";
    const BORDER_CLR = "FFD0D0D0";
    const qtyHeader = type === 'OUT' ? 'Deducted Qty' : 'Added Qty';
    const colWidths = [7, 14, 12, 22, 32, 16, 10, 16, 32];

    // Set column widths
    colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    // ── ROW 1: Title ──
    sheet.mergeCells(1, 1, 1, TOTAL_COLS);
    const titleCell = sheet.getCell("A1");
    titleCell.value = "SMS Solar - " + reportTitle;
    titleCell.font = { bold: true, size: 16, color: { argb: WHITE }, name: "Calibri" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 36;

    // ── ROW 2: Generated date + filter info ──
    sheet.mergeCells(2, 1, 2, TOTAL_COLS);
    const now = new Date();
    const genAt = now.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
    let filterInfo = "";
    if (from || to) {
      const f = from ? new Date(from).toLocaleDateString("en-IN") : "Start";
      const t = to ? new Date(to).toLocaleDateString("en-IN") : "Now";
      filterInfo = "   |   Period: " + f + " - " + t;
    }
    const subCell = sheet.getCell("A2");
    subCell.value = "Generated: " + genAt + filterInfo;
    subCell.font = { size: 10, italic: true, color: { argb: "FF6B6B6B" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9F9" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(2).height = 22;

    // ── ROW 3: Spacer ──
    sheet.mergeCells(3, 1, 3, TOTAL_COLS);
    sheet.getRow(3).height = 6;

    // ── ROW 4: Column Headers ──
    const headers = ["S.No", "Date", "Time", "Category", "Product Name", qtyHeader, "Unit", "Current Stock", "Note"];
    headers.forEach((h, i) => {
      const cell = sheet.getCell(4, i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: WHITE }, size: 11, name: "Calibri" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: WHITE } },
        bottom: { style: "thin", color: { argb: WHITE } },
        left: { style: "thin", color: { argb: WHITE } },
        right: { style: "thin", color: { argb: WHITE } },
      };
    });
    sheet.getRow(4).height = 28;

    // ── DATA ROWS ──
    transactions.forEach((tx, index) => {
      const created = tx.createdAt ? new Date(tx.createdAt) : null;
      const dateStr = created ? created.toLocaleDateString("en-IN") : "-";
      const timeStr = created ? created.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "-";

      const rowData = [
        index + 1, dateStr, timeStr,
        tx.categoryId?.name || "-",
        tx.productId?.name || "-",
        tx.quantity || 0,
        tx.unit || tx.productId?.unit || "-",
        tx.productId?.currentStock ?? 0,
        tx.note || "-",
      ];

      const rowNum = index + 5;
      const isEven = index % 2 === 0;
      const exRow = sheet.getRow(rowNum);

      rowData.forEach((val, ci) => {
        const cell = exRow.getCell(ci + 1);
        cell.value = val;
        cell.font = { size: 10, color: { argb: DARK } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? WHITE : THEME_LIGHT } };
        cell.alignment = {
          vertical: "middle",
          horizontal: ci === 0 ? "center" : (ci === 5 || ci === 7) ? "right" : "left",
          wrapText: ci === 8,
        };
        cell.border = {
          bottom: { style: "hair", color: { argb: BORDER_CLR } },
          right: { style: "hair", color: { argb: BORDER_CLR } },
        };
      });
      exRow.height = 20;
    });

    // ── SUMMARY ROW ──
    const sumRowNum = transactions.length + 5;
    sheet.mergeCells(sumRowNum, 1, sumRowNum, 5);
    const sumLabel = sheet.getCell(sumRowNum, 1);
    sumLabel.value = "Total Records: " + transactions.length;
    sumLabel.font = { bold: true, size: 10, color: { argb: WHITE } };
    sumLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME } };
    sumLabel.alignment = { horizontal: "right", vertical: "middle" };

    const totalQty = transactions.reduce((s, tx) => s + (tx.quantity || 0), 0);
    const sumQty = sheet.getCell(sumRowNum, 6);
    sumQty.value = totalQty;
    sumQty.font = { bold: true, size: 10, color: { argb: WHITE } };
    sumQty.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME } };
    sumQty.alignment = { horizontal: "right", vertical: "middle" };

    for (let c = 7; c <= TOTAL_COLS; c++) {
      const cell = sheet.getCell(sumRowNum, c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME } };
    }
    sheet.getRow(sumRowNum).height = 22;

    const filePrefix = type === 'OUT' ? 'stock_out_report' : 'stock_in_report';
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="' + filePrefix + '_' + Date.now() + '.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.exportStockInReport = exports.exportStockTransactions;
