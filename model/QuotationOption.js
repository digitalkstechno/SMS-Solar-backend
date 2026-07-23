const mongoose = require('mongoose');

const quotationOptionSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        trim: true
    },
    label: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('QuotationOption', quotationOptionSchema);
