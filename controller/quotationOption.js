const QuotationOption = require('../model/QuotationOption');

exports.getOptions = async (req, res) => {
    try {
        const options = await QuotationOption.find({});
        res.status(200).json({ success: true, data: options });
    } catch (error) {
        console.error('Error fetching quotation options:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch options' });
    }
};

exports.addOption = async (req, res) => {
    try {
        const { key, label, value } = req.body;
        
        if (!key || !label || !value) {
            return res.status(400).json({ success: false, message: 'Key, label, and value are required' });
        }

        // Check if already exists to prevent duplicates
        const existing = await QuotationOption.findOne({ key, value });
        if (existing) {
            return res.status(200).json({ success: true, data: existing });
        }

        const newOption = new QuotationOption({ key, label, value });
        await newOption.save();

        res.status(201).json({ success: true, data: newOption });
    } catch (error) {
        console.error('Error adding quotation option:', error);
        res.status(500).json({ success: false, message: 'Failed to add option' });
    }
};
