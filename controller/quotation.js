const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const User = require('../model/user');
const QuotationOption = require('../model/QuotationOption');
const Lead = require('../model/lead');

let globalBrowser = null;
const getBrowser = async () => {
  if (!globalBrowser) {
    globalBrowser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
  }
  return globalBrowser;
};

const generatePdfBuffer = async (quotation, lead) => {
  try {
    const templatePath = path.join(__dirname, '../views/quotationTemplate.ejs');
    
    const defaultLead = {
      fullName: 'Customer',
      leadrefrance: '',
      assignName: 'Sales Executive',
      contact: '',
      assignContact: ''
    };

    let leadData = lead || {};
    if (typeof leadData === 'string') {
      try {
        const dbLead = await Lead.findById(leadData);
        if (dbLead) leadData = dbLead.toObject();
      } catch (err) {
        console.error("Error fetching lead for quotation:", err);
      }
    } else if (leadData && typeof leadData === 'object' && !leadData.fullName && leadData._id) {
      try {
        const dbLead = await Lead.findById(leadData._id);
        if (dbLead) leadData = { ...dbLead.toObject(), ...leadData };
      } catch (err) {
        console.error("Error fetching lead for quotation:", err);
      }
    }

    const mergedLead = { ...defaultLead, ...leadData };
    
    if (mergedLead.assignedTo) {
      try {
        let userId = mergedLead.assignedTo;
        if (typeof userId === 'object' && userId._id) {
          userId = userId._id;
        }
        const userDoc = await User.findById(userId);
        if (userDoc) {
          mergedLead.assignName = userDoc.fullName || mergedLead.assignName;
          mergedLead.assignContact = userDoc.phone || mergedLead.assignContact;
        }
      } catch (err) {
        console.error("Error fetching user details for quotation:", err);
      }
    }

    const defaultQuotation = {
      solarModule: '',
      inverter: '',
      rows: []
    };
    const mergedQuotation = { ...defaultQuotation, ...(quotation || {}) };
    if (!Array.isArray(mergedQuotation.rows)) {
      mergedQuotation.rows = [];
    }

    let qrBase64 = '';
    try {
      const qrPath = path.join(__dirname, '../pdfs/qr.png');
      if (fs.existsSync(qrPath)) {
        qrBase64 = fs.readFileSync(qrPath, 'base64');
      }
    } catch (e) {
      console.warn('QR image not found, skipping');
    }

    let logoBase64 = '';
    try {
      const logoPath = path.join(__dirname, '../pdfs/sms.png');
      if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath, 'base64');
      }
    } catch (e) {
      console.warn('Logo image not found, skipping');
    }

    const port = process.env.PORT || 5001;
    const basePath = `http://127.0.0.1:${port}`;

    let quotationOptions = [];
    try {
      quotationOptions = await QuotationOption.find({});
    } catch (err) {
      console.error("Error fetching quotation options:", err);
    }

    const html = await ejs.renderFile(templatePath, {
      quotation: mergedQuotation,
      lead: mergedLead,
      qrBase64,
      logoBase64,
      process: process,
      basePath,
      quotationOptions
    });

    const browser = await getBrowser();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    // Allow JS in template to run and calculate values
    await page.evaluate(() => new Promise(r => setTimeout(r, 100)));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      }
    });

    await page.close();
    // Convert Uint8Array to Buffer for Express res.send
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("Puppeteer PDF generation error:", error);
    throw error;
  }
};

exports.generateQuotation = async (req, res) => {
  try {
    const { quotation, lead, data } = req.body;
    const actualLead = lead || data;
    const pdfBuffer = await generatePdfBuffer(quotation, actualLead);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=quotation.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }
};

exports.sendWhatsAppQuotation = async (req, res) => {
  try {
    const { lead, quotation, data } = req.body;
    const actualLead = lead || data;
    if (!actualLead || !actualLead.contact) {
      return res.status(400).json({ success: false, message: 'Lead contact number is required' });
    }

    const pdfBuffer = await generatePdfBuffer(quotation, actualLead);
    
    // Save to public folder
    const publicDir = path.join(__dirname, '../public');
    const pdfsDir = path.join(publicDir, 'pdfs');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
    if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir);
    
    const filename = `quotation_${actualLead._id || Date.now()}.pdf`;
    const filePath = path.join(pdfsDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    const pdfUrl = `${process.env.BACKEND_PDF_URL}/pdfs/${filename}`;
    
    let phoneNumber = String(lead.contact).replace(/\D/g, '');
    if (phoneNumber.length === 10) phoneNumber = `91${phoneNumber}`;

    const waDomain = process.env.WA_DOMAIN;
    const phoneId = process.env.WA_PHONE_ID;
    const apiUrl = `${waDomain}/api/meta/v19.0/${phoneId}/messages`;
    console.log(phoneNumber,"phoneNumber")
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      type: "template",
      template: {
          language: {
              policy: "deterministic",
              code: process.env.WA_TEMPLATE_LANG || "en_GB"
          },
          name: process.env.WA_TEMPLATE_NAME || "send_quot",
          components: [
              {
                  type: "header",
                  parameters: [
                      {
                          type: "document",
                          document: {
                              link: pdfUrl,
                              filename: "Quotation.pdf"
                          }
                      }
                  ]
              },
              {
                  type: "body",
                  parameters: [
                      {
                          type: "text",
                          text: lead.fullName || "Customer"
                      }
                  ]
              }
          ]
      }
    };

    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WA_TOKEN}`
      }
    });

    console.log('WhatsApp API Success Response:', JSON.stringify(response.data, null, 2));
    res.status(200).json({ success: true, message: 'WhatsApp sent successfully', data: response.data });
  } catch (error) {
    console.error('WhatsApp API Error Response:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to send WhatsApp', error: error.response?.data || error.message });
  }
};
