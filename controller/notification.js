const Notification = require("../model/notification");

exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id,isRead:false })
      .sort({ createdAt: -1 })
      .limit(50); // Get latest 50

    return res.status(200).json({
      status: "Success",
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      throw new Error("Notification not found");
    }

    return res.status(200).json({
      status: "Success",
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    return res.status(404).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      status: "Success",
      message: "All notifications marked as read",
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({
        status: "Fail",
        message: "fcmToken is required",
      });
    }

    const userId = req.user._id;
    const STAFF = require("../model/staff");
    const USER = require("../model/user");

    let updated = await STAFF.findByIdAndUpdate(userId, { fcmToken }, { new: true });
    if (!updated) {
      updated = await USER.findByIdAndUpdate(userId, { fcmToken }, { new: true });
    }

    return res.status(200).json({
      status: "Success",
      message: "FCM token updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};
