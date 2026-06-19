const multer = require("multer");

function createUploader(relativePath) {
  // Use memory storage instead of disk storage so we can upload files to the external service
  const storage = multer.memoryStorage();
  
  return multer({ 
    storage,
    limits: {
      fileSize: 25 * 1024 * 1024, // Set a global limit (25MB)
    }
  });
}

module.exports = createUploader;
