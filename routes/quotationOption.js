const express = require('express');
const router = express.Router();
const quotationOptionController = require('../controller/quotationOption');

router.get('/', quotationOptionController.getOptions);
router.post('/', quotationOptionController.addOption);
router.delete('/:id', quotationOptionController.deleteOption);

module.exports = router;
