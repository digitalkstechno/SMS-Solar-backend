const Task = require("../model/task");
const TaskStatus = require("../model/taskStatus");
const Notification = require("../model/notification");
const { deleteUploadedFile } = require("../utils/fileHelper");
const { uploadToExternalService, deleteFileFromExternalService } = require("../utils/externalUploader");

const sanitizeObjectId = (id) => {
  if (id === "" || id === "null" || id === "undefined" || id === null) return null;
  return id;
};


// Fetch tasks for a specific Kanban column with pagination
exports.fetchKanbanTasksByStatus = async (req, res) => {
  try {
    const { statusId, page = 1, limit = 10, search = "", my = "false" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const myTasksOnly = my === "true";

    const query = { taskStatus: statusId };
    if (search) {
      query.subject = { $regex: search, $options: "i" };
    }
    if (myTasksOnly) {
      query.assignedUsers = req.user._id;
    }

    const totalItems = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .populate("assignedUsers", "fullName email")
      .populate("assignedTeams", "name")
      .populate("createdBy", "fullName")
      .populate("taskStatus");

    return res.status(200).json({
      status: "Success",
      data: tasks,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / parseInt(limit)),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.createTask = async (req, res) => {
  let uploadedAttachments = [];
  try {
    const { subject, description, startDate, endDate, taskStatus, priority } = req.body;

    const parseIds = (val) => {
      if (!val) return [];
      try { return JSON.parse(val); } catch { return Array.isArray(val) ? val : [val]; }
    };

    for (const f of (req.files || [])) {
      const fileUrl = await uploadToExternalService(f, 'TaskAttachments');
      uploadedAttachments.push({
        originalName: f.originalname,
        filename: f.originalname,
        path: fileUrl,
      });
    }

    const taskData = {
      subject,
      description,
      startDate,
      endDate,
      priority,
      assignedUsers: parseIds(req.body.assignedUsers),
      assignedTeams: parseIds(req.body.assignedTeams),
      attachments: uploadedAttachments,
      createdBy: req.user?._id,
      taskStatus: sanitizeObjectId(taskStatus),
    };

    const task = await Task.create(taskData);

    // Send notifications to assigned users
    if (task.assignedUsers && task.assignedUsers.length > 0) {
      const notifications = task.assignedUsers
        .filter(userId => req.user && String(userId) !== String(req.user._id))
        .map(userId => ({
          recipient: userId,
          title: "New Task Assigned",
          message: `You have been assigned to a new task: ${task.subject}`,
          type: "task",
          relatedId: task._id,
          isRead: false,
          createdAt: new Date().toISOString()
        }));
      if (notifications.length > 0) {
        const createdNotifications = await Notification.insertMany(notifications);
        
        // Emit Socket Event
        const { getIO } = require("../utils/socket");
        try {
          const io = getIO();
          createdNotifications.forEach(notif => {
            io.to(notif.recipient.toString()).emit('new_task_assigned', notif);
          });
        } catch(err) {
          console.error("Socket emit error:", err);
        }
      }
    }

    return res.status(201).json({ status: "Success", message: "Task created successfully", data: task });
  } catch (error) {
    for (const att of uploadedAttachments) {
      if (att.path && att.path.startsWith('http')) {
        await deleteFileFromExternalService(att.path).catch(console.error);
      }
    }
    // Also cleanup local if there are any that were locally saved previously (safety)
    (req.files || []).forEach((f) => {
      if (!uploadedAttachments.some(a => a.originalName === f.originalname)) {
         deleteUploadedFile("images/TaskAttachments", f.filename);
      }
    });
    return res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = search ? { subject: { $regex: search, $options: "i" } } : {};
    
    // Status filter
    if (req.query.status) {
      query.taskStatus = req.query.status;
    }
    
    if (req.query.priority) query.priority = req.query.priority;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .skip(skip).limit(limit).sort({ createdAt: -1 })
      .populate("assignedUsers", "fullName email")
      .populate("assignedTeams", "name")
      .populate("createdBy", "fullName")
      .populate("taskStatus");

    return res.status(200).json({
      status: "Success",
      data: tasks,
      pagination: { totalRecords: total, currentPage: page, totalPages: Math.ceil(total / limit), limit },
    });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedUsers", "fullName email")
      .populate("assignedTeams", "name")
      .populate("createdBy", "fullName")
      .populate("taskStatus");
    if (!task) throw new Error("Task not found");
    return res.status(200).json({ status: "Success", data: task });
  } catch (error) {
    return res.status(404).json({ status: "Fail", message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  let newAttachments = [];
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw new Error("Task not found");

    const parseIds = (val) => {
      if (!val) return [];
      try { return JSON.parse(val); } catch { return Array.isArray(val) ? val : [val]; }
    };

    const updateData = { ...req.body };
    if (req.body.assignedUsers !== undefined) updateData.assignedUsers = parseIds(req.body.assignedUsers);
    if (req.body.assignedTeams !== undefined) updateData.assignedTeams = parseIds(req.body.assignedTeams);

    // Handle status explicitly if provided
    if (req.body.taskStatus !== undefined) {
      updateData.taskStatus = sanitizeObjectId(req.body.taskStatus);
    }

    if (req.files?.length) {
      for (const f of req.files) {
        const fileUrl = await uploadToExternalService(f, 'TaskAttachments');
        newAttachments.push({
          originalName: f.originalname,
          filename: f.originalname,
          path: fileUrl,
        });
      }
      updateData.attachments = [...(task.attachments || []), ...newAttachments];
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });

    // Handle notifications for newly assigned users
    const oldUsers = task.assignedUsers ? task.assignedUsers.map(u => String(u._id || u)) : [];
    const newUsers = updated.assignedUsers ? updated.assignedUsers.map(u => String(u._id || u)) : [];
    const addedUsers = newUsers.filter(u => !oldUsers.includes(u) && (!req.user || u !== String(req.user._id)));

    if (addedUsers.length > 0) {
      const notifications = addedUsers.map(userId => ({
        recipient: userId,
        title: "Task Assigned",
        message: `You have been assigned to the task: ${updated.subject}`,
        type: "task",
        relatedId: updated._id,
        isRead: false,
        createdAt: new Date().toISOString()
      }));
      const createdNotifications = await Notification.insertMany(notifications);

      // Emit Socket Event
      const { getIO } = require("../utils/socket");
      try {
        const io = getIO();
        createdNotifications.forEach(notif => {
          io.to(notif.recipient.toString()).emit('new_task_assigned', notif);
        });
      } catch(err) {
        console.error("Socket emit error:", err);
      }
    }

    return res.status(200).json({ status: "Success", message: "Task updated successfully", data: updated });
  } catch (error) {
    for (const att of newAttachments) {
      if (att.path && att.path.startsWith('http')) {
        await deleteFileFromExternalService(att.path).catch(console.error);
      }
    }
    (req.files || []).forEach((f) => {
      if (!newAttachments.some(a => a.originalName === f.originalname)) {
         deleteUploadedFile("images/TaskAttachments", f.filename);
      }
    });
    return res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.getMyTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const query = { assignedUsers: req.user._id };
    if (search) query.subject = { $regex: search, $options: "i" };
    
    // Status filter
    if (req.query.status) {
      query.taskStatus = req.query.status;
    }
    
    if (req.query.priority) query.priority = req.query.priority;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .skip(skip).limit(limit).sort({ createdAt: -1 })
      .populate("assignedUsers", "fullName email")
      .populate("assignedTeams", "name")
      .populate("createdBy", "fullName")
      .populate("taskStatus");

    return res.status(200).json({
      status: "Success",
      data: tasks,
      pagination: { totalRecords: total, currentPage: page, totalPages: Math.ceil(total / limit), limit },
    });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = {};

    if (status) {
      updateData.taskStatus = status;
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("taskStatus");

    if (!task) throw new Error("Task not found");
    return res.status(200).json({ status: "Success", data: task });
  } catch (error) {
    return res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.updateTaskPriority = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { priority: req.body.priority },
      { new: true }
    );
    if (!task) throw new Error("Task not found");
    return res.status(200).json({ status: "Success", data: task });
  } catch (error) {
    return res.status(400).json({ status: "Fail", message: error.message });
  }
};

exports.getTaskSummary = async (req, res) => {
  try {
    // Get all task statuses
    const taskStatuses = await TaskStatus.find().sort({ order: 1 });

    // Build status query for each status
    const statusCounts = {};
    let total = 0;

    for (const status of taskStatuses) {
      const count = await Task.countDocuments({ taskStatus: status._id });
      statusCounts[status._id.toString()] = count;
      statusCounts[status.name] = count;
      total += count;
    }

    const [low, medium, high] = await Promise.all([
      Task.countDocuments({ priority: 'low' }),
      Task.countDocuments({ priority: 'medium' }),
      Task.countDocuments({ priority: 'high' }),
    ]);

    return res.status(200).json({
      status: 'Success',
      data: {
        total,
        statusCounts,
        taskStatuses: taskStatuses,
        low, medium, high
      },
    });
  } catch (error) {
    return res.status(500).json({ status: 'Fail', message: error.message });
  }
};

exports.getMyTaskSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    // Get all task statuses
    const taskStatuses = await TaskStatus.find().sort({ order: 1 });

    const statusCounts = {};
    let total = 0;

    for (const status of taskStatuses) {
      const count = await Task.countDocuments({ assignedUsers: userId, taskStatus: status._id });
      statusCounts[status._id.toString()] = count;
      statusCounts[status.name] = count;
      total += count;
    }

    return res.status(200).json({
      status: 'Success',
      data: { total, statusCounts, taskStatuses },
    });
  } catch (error) {
    return res.status(500).json({ status: 'Fail', message: error.message });
  }
};

// Get all tasks grouped by status for kanban view
exports.getTasksForKanban = async (req, res) => {
  try {
    const search = req.query.search || "";
    const myTasksOnly = req.query.my === 'true';

    // Get all task statuses
    const taskStatuses = await TaskStatus.find().sort({ order: 1 });

    // Build base query
    const baseQuery = {};
    if (search) {
      baseQuery.subject = { $regex: search, $options: "i" };
    }
    if (myTasksOnly) {
      baseQuery.assignedUsers = req.user._id;
    }

    // Get all tasks with their statuses
    const allTasks = await Task.find(baseQuery)
      .populate("assignedUsers", "fullName email")
      .populate("assignedTeams", "name")
      .populate("createdBy", "fullName")
      .populate("taskStatus")
      .sort({ createdAt: -1 });

    // Group tasks by status
    const tasksByStatus = {};

    // Initialize with all statuses
    for (const status of taskStatuses) {
      tasksByStatus[status._id.toString()] = {
        _id: status._id,
        name: status.name,
        color: status.color,
        order: status.order,
        tasks: []
      };
    }

    // Distribute tasks into their status groups
    for (const task of allTasks) {
      let statusKey;
      if (task.taskStatus) {
        statusKey = task.taskStatus._id.toString();
      } else {
        // Default to first status if no status set
        statusKey = taskStatuses.length > 0 ? taskStatuses[0]._id.toString() : null;
      }

      if (statusKey && tasksByStatus[statusKey]) {
        tasksByStatus[statusKey].tasks.push(task);
      }
    }

    // Convert to array and sort by order
    const groupedTasks = Object.values(tasksByStatus)
      .sort((a, b) => a.order - b.order);

    return res.status(200).json({
      status: 'Success',
      data: {
        statuses: taskStatuses,
        tasksByStatus: groupedTasks
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'Fail', message: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw new Error("Task not found");
    
    for (const a of (task.attachments || [])) {
      if (a.path && a.path.startsWith('http')) {
        await deleteFileFromExternalService(a.path).catch(console.error);
      } else if (a.filename) {
        deleteUploadedFile("images/TaskAttachments", a.filename);
      }
    }
    
    await Task.findByIdAndDelete(req.params.id);
    return res.status(200).json({ status: "Success", message: "Task deleted successfully" });
  } catch (error) {
    return res.status(404).json({ status: "Fail", message: error.message });
  }
};

exports.getTodayTasks = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tasks = await Task.find({
      assignedUsers: req.user._id,
      $or: [
        { startDate: { $gte: todayStart, $lte: todayEnd } },
        { endDate: { $gte: todayStart, $lte: todayEnd } },
        { 
          $and: [
            { startDate: { $lte: todayStart } },
            { endDate: { $gte: todayEnd } }
          ]
        }
      ]
    })
    .populate("taskStatus")
    .sort({ priority: -1, createdAt: -1 });

    return res.status(200).json({
      status: "Success",
      data: tasks
    });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ status: "Fail", message: "Task not found" });
    }

    // Find the attachment
    const attachmentIndex = task.attachments.findIndex(
      (att) => att._id?.toString() === attachmentId || att.path === attachmentId
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({ status: "Fail", message: "Attachment not found" });
    }

    const attachment = task.attachments[attachmentIndex];

    // Delete file from filesystem or external service
    if (attachment.path && attachment.path.startsWith('http')) {
      await deleteFileFromExternalService(attachment.path).catch(console.error);
    } else if (attachment.filename) {
      deleteUploadedFile("images/TaskAttachments", attachment.filename);
    }

    // Remove from DB via splice
    task.attachments.splice(attachmentIndex, 1);
    await task.save();

    return res.status(200).json({
      status: "Success",
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ status: "Fail", message: error.message });
  }
};
