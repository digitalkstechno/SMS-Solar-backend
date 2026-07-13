const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const axios = require('axios');

const staticImageCache = {};

const generatePdfBuffer = async (quotation) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        autoFirstPage: false 
      });

      if (quotation && quotation.streamTarget) {
        doc.pipe(quotation.streamTarget);
        quotation.streamTarget.on('finish', () => resolve());
      } else {
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
      }
      doc.on('error', reject);

      const drawStaticPage = async (pageNum) => {
        doc.addPage({ size: 'A4', margin: 0 });
        const imagePath = path.join(__dirname, `../pdfs-png/${pageNum}.jpg`);
        if (fs.existsSync(imagePath)) {
          if (!staticImageCache[imagePath]) {
            staticImageCache[imagePath] = await sharp(imagePath)
              .resize({ width: 1190 }) 
              .jpeg({ quality: 80, mozjpeg: true }) 
              .toBuffer();
          }
          doc.image(staticImageCache[imagePath], 0, 0, { width: doc.page.width, height: doc.page.height });
        } else {
          doc.text(`Page ${pageNum} image not found`, 50, 50);
        }
      };

      for (let i = 1; i <= 4; i++) {
        await drawStaticPage(i);
      }

      doc.addPage({ size: 'A4', margin: 0 });
      const blankPath = path.join(__dirname, '../pdfs-png/blank.jpg');
      if (fs.existsSync(blankPath)) {
        if (!staticImageCache[blankPath]) {
          staticImageCache[blankPath] = await sharp(blankPath)
            .resize({ width: 1190 })
            .jpeg({ quality: 80, mozjpeg: true })
            .toBuffer();
        }
        doc.image(staticImageCache[blankPath], 0, 0, { width: doc.page.width, height: doc.page.height });
      }

      if (quotation) {
        let y = 150; 
        
        const formattedDate = quotation.date ? new Date(quotation.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
        
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e293b');
        doc.text(`DATE: ${formattedDate}`, 0, y - 40, { align: 'right', width: doc.page.width - 50 });
        
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#A63C71').text('COMMERCIAL OFFER:', 50, y);
        y += 20;
        doc.font('Helvetica').fontSize(11).fillColor('#64748b').text('Price for complete solar system with 5 years free AMC.', 50, y);
        y += 25;

        const options = quotation.options || [];
        const numOptions = Math.max(1, options.length);
        const tableWidth = 495;
        const titleWidth = numOptions > 1 ? 200 : 300;
        const colWidth = (tableWidth - titleWidth) / numOptions;

        const titleBg = '#A63C71';
        const valBg = '#fdf5f9';

        const drawSingleRow = (title, val, bgTitle, bgVal) => {
          doc.rect(50, y, titleWidth, 25).fill(bgTitle).stroke();
          doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text(title, 60, y + 7, { width: titleWidth - 10 });
          
          const valTotalWidth = tableWidth - titleWidth;
          doc.rect(50 + titleWidth, y, valTotalWidth, 25).fill(bgVal).stroke();
          doc.fillColor('#1e293b').font('Helvetica').fontSize(10).text(val || '-', 50 + titleWidth + 10, y + 7, { width: valTotalWidth - 20 });
          y += 27;
        };

        drawSingleRow('SOLAR MODULE MAKE', quotation.solarModule, titleBg, valBg);
        drawSingleRow('INVERTER', quotation.inverter, titleBg, valBg);
        
        if (quotation.rows && quotation.rows.length > 0) {
          // Options Header
          if (options.length > 0) {
            doc.rect(50, y, titleWidth, 25).fill(titleBg).stroke();
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text('DESCRIPTION', 60, y + 7, { width: titleWidth - 10 });
            options.forEach((opt, idx) => {
              const x = 50 + titleWidth + (idx * colWidth);
              doc.rect(x, y, colWidth, 25).fill(titleBg).stroke();
              doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text((opt || `OPTION ${idx+1}`).toUpperCase(), x + 5, y + 7, { width: colWidth - 10, align: 'center' });
            });
            y += 27;
          }

          const drawMultiRow = (title, vals, bgTitle, bgVal) => {
            doc.rect(50, y, titleWidth, 25).fill(bgTitle).stroke();
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text(title, 60, y + 7, { width: titleWidth - 10 });
            
            for (let i = 0; i < numOptions; i++) {
              const x = 50 + titleWidth + (i * colWidth);
              doc.rect(x, y, colWidth, 25).fill(bgVal).stroke();
              doc.fillColor('#1e293b').font('Helvetica').fontSize(10).text(vals[i] || '-', x + 5, y + 7, { width: colWidth - 10, align: 'center' });
            }
            y += 27;
          };

          quotation.rows.forEach(r => {
            drawMultiRow(r.title, r.values || [], titleBg, valBg);
          });
        }
        
        y += 10;
        doc.fillColor('#A63C71').font('Helvetica-Bold').fontSize(9).text('Note: If you are eligible, the subsidy amount will be credited by the government to your bank account after the meter installation is completed. Please keep this in mind during your planning.', 50, y, { width: 495 });
        y += 35;

        doc.rect(50, y, 247, 25).fill(titleBg).stroke();
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text('DOCUMENTS REQUIRED FOR INDIVIDUAL SOLAR', 55, y + 7, { width: 237, align: 'center' });
        
        doc.rect(297, y, 248, 25).fill(titleBg).stroke();
        doc.fillColor('#ffffff').text('DOCUMENTS REQUIRED FOR COMMON SOLAR', 302, y + 7, { width: 238, align: 'center' });
        y += 27;

        const indDocs = ['Latest Light Bill', 'Aadhar Card Copy', 'Cancelled Cheque', 'Passport Size Photo', 'Property Tax Bill'];
        const comDocs = ['Latest Light Bill', 'PAN Card', 'Cancelled Cheque', 'Society Registration Letter', 'Sammati Patrak (Consent Letter)'];

        for (let i = 0; i < 5; i++) {
          doc.rect(50, y, 247, 20).fill(valBg).stroke();
          doc.fillColor('#1e293b').font('Helvetica').fontSize(9).text(indDocs[i], 55, y + 5, { width: 237, align: 'center' });
          
          doc.rect(297, y, 248, 20).fill(valBg).stroke();
          doc.fillColor('#1e293b').text(comDocs[i], 302, y + 5, { width: 238, align: 'center' });
          y += 20;
        }
        
        y += 20;
        doc.fillColor('#A63C71').font('Helvetica-Bold').fontSize(11).text('TERMS & CONDITIONS:', 50, y);
        y += 15;
        
        doc.fontSize(10).text('GST: ', 50, y, { continued: true }).font('Helvetica').fillColor('#475569').text('Included at actual rate of 8.9%');
        y += 15;
        
        doc.font('Helvetica-Bold').fillColor('#A63C71').text('COMPLETION TIMELINE: ', 50, y, { continued: true }).font('Helvetica').fillColor('#475569').text('Work will be completed within 45 days from the date of receipt of Work Order & Procurement clearance, or receipt of advance payment (whichever is later), subject to site clearance.', { width: 495 });
        y += 35;
        
        doc.font('Helvetica-Bold').fillColor('#A63C71').text('WARRANTY:', 50, y);
        y += 15;
        doc.font('Helvetica').fillColor('#475569').text('• Solar Modules: 30 years output warranty\n• Inverter: 10 years warranty with monitoring\n• Free service warranty : 5 years included (Physical damage not applicable)', 60, y);
      }

      for (let i = 6; i <= 9; i++) {
        await drawStaticPage(i);
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
};

exports.generateQuotation = async (req, res) => {
  try {
    const { quotation } = req.body;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=quotation.pdf');
    
    // Add stream target to stream directly to response
    quotation.streamTarget = res;
    await generatePdfBuffer(quotation);
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }
};

exports.sendWhatsAppQuotation = async (req, res) => {
  try {
    const { lead, quotation } = req.body;
    if (!lead || !lead.contact) {
      return res.status(400).json({ success: false, message: 'Lead contact number is required' });
    }

    const pdfBuffer = await generatePdfBuffer(quotation);
    
    // Save to public folder
    const publicDir = path.join(__dirname, '../public');
    const pdfsDir = path.join(publicDir, 'pdfs');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
    if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir);
    
    const filename = `quotation_${lead._id || Date.now()}.pdf`;
    const filePath = path.join(pdfsDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    const pdfUrl = `${process.env.BACKEND_PDF_URL}/pdfs/${filename}`;
    // const pdfUrl = `https://service.digitalks.co.in/s3docs/sms_solar/sms/bc3d9163e3d64693bbd9c9abdfee8351.pdf`;
    
    let phoneNumber = lead.contact.replace(/\D/g, '');
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
