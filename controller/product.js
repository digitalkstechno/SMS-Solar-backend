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

exports.exportLiveStockReport = async (req, res) => {
  try {
    const ExcelJS = require("exceljs");
    const { search } = req.query;
    const productQuery = search?.trim()
      ? { name: { $regex: search.trim(), $options: "i" } }
      : {};
    const products = await PRODUCT.find(productQuery)
      .populate("categoryId", "name")
      .sort({ "categoryId.name": 1, name: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CRM System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Live Stock Sheet", {
      pageSetup: { fitToPage: true, orientation: "landscape" },
    });

    const TOTAL_COLS = 5;
    const THEME     = "FFA63C71";
    const THEME_LIGHT = "FFF5E9F1";
    const WHITE     = "FFFFFFFF";
    const DARK      = "FF2D2D2D";
    const BORDER    = "FFD0D0D0";
    const colWidths = [7, 28, 38, 18, 14];

    // Set column widths
    colWidths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    // ── ROW 1: Company Title ──
    sheet.mergeCells(1, 1, 1, TOTAL_COLS);
    const titleCell = sheet.getCell("A1");
    titleCell.value = "SMS Solar — Live Stock Sheet";
    titleCell.font = { bold: true, size: 16, color: { argb: WHITE }, name: "Calibri" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 36;

    // ── ROW 2: Generated date ──
    sheet.mergeCells(2, 1, 2, TOTAL_COLS);
    const now = new Date();
    const genAt = now.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
    const subCell = sheet.getCell("A2");
    subCell.value = "Generated: " + genAt + (search?.trim() ? "   |   Search: " + search.trim() : "   |   All Products");
    subCell.font = { size: 10, italic: true, color: { argb: "FF6B6B6B" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9F9" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(2).height = 22;

    // ── ROW 3: Spacer ──
    sheet.mergeCells(3, 1, 3, TOTAL_COLS);
    sheet.getRow(3).height = 6;

    // ── ROW 4: Column Headers ──
    const headers = ["S.No", "Category", "Product Name", "Current Stock", "Unit"];
    headers.forEach((h, i) => {
      const cell = sheet.getCell(4, i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: WHITE }, size: 11, name: "Calibri" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top:    { style: "thin", color: { argb: WHITE } },
        bottom: { style: "thin", color: { argb: WHITE } },
        left:   { style: "thin", color: { argb: WHITE } },
        right:  { style: "thin", color: { argb: WHITE } },
      };
    });
    sheet.getRow(4).height = 28;

    // ── DATA ROWS ──
    products.forEach((prod, index) => {
      const stock = prod.currentStock ?? 0;
      const rowData = [
        index + 1,
        prod.categoryId?.name || "-",
        prod.name || "-",
        stock,
        prod.unit || "Qty",
      ];

      const rowNum = index + 5;
      const isEven = index % 2 === 0;
      const exRow = sheet.getRow(rowNum);

      rowData.forEach((val, ci) => {
        const cell = exRow.getCell(ci + 1);
        cell.value = val;
        cell.font = {
          size: 10,
          color: { argb: ci === 3 && stock < 0 ? "FFCC0000" : DARK },
          bold: ci === 3 && stock < 0,
        };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? WHITE : THEME_LIGHT } };
        cell.alignment = {
          vertical: "middle",
          horizontal: ci === 0 ? "center" : ci === 3 ? "right" : "left",
        };
        cell.border = {
          bottom: { style: "hair", color: { argb: BORDER } },
          right:  { style: "hair", color: { argb: BORDER } },
        };
      });
      exRow.height = 20;
    });

    // ── SUMMARY ROW ──
    const sumRowNum = products.length + 5;
    sheet.mergeCells(sumRowNum, 1, sumRowNum, 3);
    const sumLabel = sheet.getCell(sumRowNum, 1);
    sumLabel.value = "Total Products: " + products.length;
    sumLabel.font = { bold: true, size: 10, color: { argb: WHITE } };
    sumLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME } };
    sumLabel.alignment = { horizontal: "right", vertical: "middle" };
    for (let c = 4; c <= TOTAL_COLS; c++) {
      const cell = sheet.getCell(sumRowNum, c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME } };
    }
    sheet.getRow(sumRowNum).height = 22;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="live_stock_sheet_' + Date.now() + '.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
