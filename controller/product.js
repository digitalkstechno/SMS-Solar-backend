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
    workbook.creator = "SMS Solar CRM";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Live Stock Sheet", {
      pageSetup: { fitToPage: true, orientation: "portrait" },
      views: [{ state: "frozen", ySplit: 3 }],
    });

    const TOTAL_COLS = 5;
    const THEME_MAIN   = "FFA63C71"; // Primary theme brand color (#A63C71)
    const THEME_DARK   = "FF7A2650"; // Darker theme for subheaders
    const THEME_LIGHT  = "FFFDF4F8"; // Soft theme tint for rows
    const HEADER_BG    = "FFF3E8EE"; // Column header background
    const WHITE        = "FFFFFFFF";
    const DARK_TEXT    = "FF1F2937";
    const GRAY_TEXT    = "FF6B7280";
    const RED_TEXT     = "FFDC2626";
    const RED_BG       = "FFFEE2E2";
    const GREEN_TEXT   = "FF16A34A";
    const BORDER_COLOR = "FFE5E7EB";

    // Set column widths
    sheet.getColumn(1).width = 8;   // S.No
    sheet.getColumn(2).width = 38;  // Product Name
    sheet.getColumn(3).width = 18;  // Current Stock
    sheet.getColumn(4).width = 16;  // Unit
    sheet.getColumn(5).width = 18;  // Status

    // ── ROW 1: Master Company Title Banner ──
    sheet.mergeCells(1, 1, 1, TOTAL_COLS);
    const titleCell = sheet.getCell("A1");
    titleCell.value = "SMS SOLAR — LIVE STOCK SHEET";
    titleCell.font = { bold: true, size: 15, color: { argb: WHITE }, name: "Segoe UI" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME_MAIN } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 36;

    // ── ROW 2: Subtitle with Date & Summary Stats ──
    sheet.mergeCells(2, 1, 2, TOTAL_COLS);
    const now = new Date();
    const genAt = now.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
    const subCell = sheet.getCell("A2");
    subCell.value = `Report Generated: ${genAt}   |   Total Products: ${products.length}${search?.trim() ? `   |   Search: "${search.trim()}"` : ""}`;
    subCell.font = { size: 9.5, italic: true, color: { argb: GRAY_TEXT }, name: "Segoe UI" };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
    subCell.alignment = { vertical: "middle", horizontal: "center" };
    subCell.border = { bottom: { style: "thin", color: { argb: BORDER_COLOR } } };
    sheet.getRow(2).height = 22;

    // ── ROW 3: Blank Spacer ──
    sheet.mergeCells(3, 1, 3, TOTAL_COLS);
    sheet.getRow(3).height = 8;

    // Group products by Category + Unit (exact representation of UI cards)
    const grouped = {};
    products.forEach((prod) => {
      const catName = (prod.categoryId?.name || "GENERAL / OTHER").toUpperCase().trim();
      const unit = (prod.unit || "QTY").toUpperCase().trim();
      const groupKey = `${catName} (${unit})`;
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          categoryName: catName,
          unit: unit,
          items: [],
        };
      }
      grouped[groupKey].items.push(prod);
    });

    let currentRow = 4;
    let globalIndex = 1;

    Object.entries(grouped).forEach(([groupTitle, groupData]) => {
      // ── Category Header Banner ──
      sheet.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
      const catHeaderCell = sheet.getCell(currentRow, 1);
      catHeaderCell.value = `📦  ${groupTitle}`;
      catHeaderCell.font = { bold: true, size: 11.5, color: { argb: WHITE }, name: "Segoe UI" };
      catHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME_MAIN } };
      catHeaderCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      sheet.getRow(currentRow).height = 26;
      currentRow++;

      // ── Column Headers for this Category ──
      const headers = ["S.No", "Product Name", "Current Stock", "Unit", "Stock Status"];
      headers.forEach((headerText, colIdx) => {
        const colCell = sheet.getCell(currentRow, colIdx + 1);
        colCell.value = headerText;
        colCell.font = { bold: true, size: 9.5, color: { argb: THEME_DARK }, name: "Segoe UI" };
        colCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
        colCell.alignment = {
          vertical: "middle",
          horizontal: colIdx === 0 ? "center" : colIdx === 2 ? "right" : colIdx === 1 ? "left" : "center",
        };
        colCell.border = {
          top:    { style: "thin", color: { argb: BORDER_COLOR } },
          bottom: { style: "medium", color: { argb: THEME_MAIN } },
          left:   { style: "thin", color: { argb: BORDER_COLOR } },
          right:  { style: "thin", color: { argb: BORDER_COLOR } },
        };
      });
      sheet.getRow(currentRow).height = 22;
      currentRow++;

      // ── Products under this Category ──
      let categoryTotalStock = 0;

      groupData.items.forEach((prod, itemIdx) => {
        const stockVal = Number(prod.currentStock || 0);
        categoryTotalStock += stockVal;
        const isNegative = stockVal < 0;
        const isZero = stockVal === 0;
        const isEven = itemIdx % 2 === 0;

        let statusText = "In Stock";
        let statusColor = GREEN_TEXT;
        if (isNegative) {
          statusText = "Negative Stock";
          statusColor = RED_TEXT;
        } else if (isZero) {
          statusText = "Out of Stock";
          statusColor = GRAY_TEXT;
        }

        const rowValues = [
          globalIndex++,
          prod.name || "-",
          stockVal,
          prod.unit || groupData.unit || "Qty",
          statusText,
        ];

        const rowObj = sheet.getRow(currentRow);
        rowValues.forEach((val, cIdx) => {
          const cell = rowObj.getCell(cIdx + 1);
          cell.value = val;
          cell.font = {
            size: 9.5,
            name: "Segoe UI",
            bold: cIdx === 2 || (cIdx === 4 && isNegative),
            color: {
              argb: cIdx === 2 && isNegative
                ? RED_TEXT
                : cIdx === 4
                ? statusColor
                : DARK_TEXT,
            },
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: isNegative && (cIdx === 2 || cIdx === 4)
                ? RED_BG
                : isEven
                ? WHITE
                : THEME_LIGHT,
            },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: cIdx === 0 ? "center" : cIdx === 2 ? "right" : cIdx === 1 ? "left" : "center",
          };
          cell.border = {
            top:    { style: "hair", color: { argb: BORDER_COLOR } },
            bottom: { style: "hair", color: { argb: BORDER_COLOR } },
            left:   { style: "hair", color: { argb: BORDER_COLOR } },
            right:  { style: "hair", color: { argb: BORDER_COLOR } },
          };
        });
        rowObj.height = 20;
        currentRow++;
      });

      // ── Category Subtotal Row ──
      sheet.mergeCells(currentRow, 1, currentRow, 2);
      const subLabel = sheet.getCell(currentRow, 1);
      subLabel.value = `Subtotal (${groupData.items.length} items)`;
      subLabel.font = { bold: true, size: 9.5, color: { argb: DARK_TEXT }, name: "Segoe UI" };
      subLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      subLabel.alignment = { vertical: "middle", horizontal: "right" };

      const subStock = sheet.getCell(currentRow, 3);
      subStock.value = categoryTotalStock;
      subStock.font = { bold: true, size: 9.5, color: { argb: categoryTotalStock < 0 ? RED_TEXT : DARK_TEXT }, name: "Segoe UI" };
      subStock.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      subStock.alignment = { vertical: "middle", horizontal: "right" };

      const subUnit = sheet.getCell(currentRow, 4);
      subUnit.value = groupData.unit;
      subUnit.font = { bold: true, size: 9.5, color: { argb: GRAY_TEXT }, name: "Segoe UI" };
      subUnit.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      subUnit.alignment = { vertical: "middle", horizontal: "center" };

      const subEnd = sheet.getCell(currentRow, 5);
      subEnd.value = "";
      subEnd.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };

      [1, 2, 3, 4, 5].forEach((colN) => {
        sheet.getCell(currentRow, colN).border = {
          top:    { style: "thin", color: { argb: BORDER_COLOR } },
          bottom: { style: "medium", color: { argb: "FFD1D5DB" } },
        };
      });
      sheet.getRow(currentRow).height = 21;
      currentRow++;

      // Spacer between categories
      sheet.mergeCells(currentRow, 1, currentRow, TOTAL_COLS);
      sheet.getRow(currentRow).height = 10;
      currentRow++;
    });

    // ── GRAND SUMMARY BLOCK ──
    sheet.mergeCells(currentRow, 1, currentRow, 2);
    const grandLabel = sheet.getCell(currentRow, 1);
    grandLabel.value = `GRAND TOTAL: ${Object.keys(grouped).length} CATEGORIES | ${products.length} PRODUCTS`;
    grandLabel.font = { bold: true, size: 10.5, color: { argb: WHITE }, name: "Segoe UI" };
    grandLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME_MAIN } };
    grandLabel.alignment = { vertical: "middle", horizontal: "center" };

    for (let c = 3; c <= TOTAL_COLS; c++) {
      const cell = sheet.getCell(currentRow, c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME_MAIN } };
    }
    sheet.getRow(currentRow).height = 26;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="live_stock_sheet_${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
