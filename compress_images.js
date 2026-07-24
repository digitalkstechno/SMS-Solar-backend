const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function optimizeImage(filename, width = 600) {
  const filePath = path.join(__dirname, 'pdfs', filename);
  const tempPath = path.join(__dirname, 'pdfs', `optimized2_${path.basename(filename)}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skip: ${filePath}`);
    return;
  }
  
  console.log(`Optimizing ${filename}...`);
  try {

    const pipeline = sharp(filePath)
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality: 40 }); 
    
    await pipeline.toFile(tempPath);
    
    
    fs.unlinkSync(filePath);
    fs.renameSync(tempPath, filePath);
    console.log(`Optimized ${filename}`);
  } catch (err) {
    console.error(`Error optimizing ${filename}:`, err);
  }
}

async function run() {
  await optimizeImage('Residential.jpeg', 500);
  await optimizeImage('commercial.png', 500); 
  await optimizeImage('Industrial.jpeg', 500);

  await optimizeImage('stemp.jpeg', 300);
  
  // Materials
  await optimizeImage('materials/LA CABLE.png', 200);
  await optimizeImage('materials/SOLAR INVERTER.png', 200);
  await optimizeImage('materials/SOLAR PANEL.jpg', 200);
  await optimizeImage('materials/DC CABLE.jpg', 200);
  await optimizeImage('materials/ACDB DCDB.jpeg', 200);
  await optimizeImage('materials/AC CABLE.jpeg', 200);
  await optimizeImage('materials/EARTHING CABLE.jpg', 200);
  await optimizeImage('materials/PVC PIPE.jpg', 200);
  await optimizeImage('materials/STRUCTURE.jpg', 200);
  await optimizeImage('materials/J BOULT.jpg', 200);
  await optimizeImage('materials/CABLE TIE.jpg', 200);
  await optimizeImage('materials/Earthing-Kit.jpg', 200);
  await optimizeImage('materials/solar-mc4-connector.jpg', 200);
  await optimizeImage('materials/BASE PLATE.jpg', 200);
  await optimizeImage('materials/COATING SPRAY.jpg', 200);
  
  console.log('Done compressing');
}

run();
