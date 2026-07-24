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

exports.deleteOption = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedOption = await QuotationOption.findByIdAndDelete(id);
        if (!deletedOption) {
            return res.status(404).json({ success: false, message: 'Option not found' });
        }
        res.status(200).json({ success: true, message: 'Option deleted successfully', data: deletedOption });
    } catch (error) {
        console.error('Error deleting quotation option:', error);
        res.status(500).json({ success: false, message: 'Failed to delete option' });
    }
};
