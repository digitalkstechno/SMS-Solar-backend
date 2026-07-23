const express = require('express');
const router = express.Router();
const quotationOptionController = require('../controller/quotationOption');

router.get('/', quotationOptionController.getOptions);
router.post('/', quotationOptionController.addOption);

module.exports = router;
