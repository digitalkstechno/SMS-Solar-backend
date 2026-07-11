const LEAD = require("../model/lead");
const mongoose = require("mongoose");
const moment = require("moment");

exports.getKwGrowth = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const matchStage = {
      isActive: { $ne: false },
    };

    matchStage.createdAt = {
      $gte: new Date(`${targetYear}-01-01T00:00:00.000Z`),
      $lte: new Date(`${targetYear}-12-31T23:59:59.999Z`)
    };

    if (req.leadScope === "own" && req.user && req.user._id) {
      matchStage.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    const growthData = await LEAD.find(matchStage).populate('leadStatus').lean();

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let monthlyKW = Object.fromEntries(months.map(m => [m, 0]));
    let totalKwSum = 0;

    for (const lead of growthData) {
      const statusName = lead.leadStatus?.name?.toLowerCase() || "";
      let isWon = statusName === "won" || statusName === "sales won";
      if (isWon && lead.createdAt) {
        const d = new Date(lead.createdAt);
        const monthLabel = months[d.getMonth()];
        const kw = parseFloat(lead.kwRequirement || 0) || 0;
        monthlyKW[monthLabel] += kw;
        totalKwSum += kw;
      }
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const displayMonths = targetYear === currentYear ? months.slice(0, currentMonth + 1) : targetYear < currentYear ? months : [];

    const finalChartData = displayMonths.map(m => ({
      date: m,
      kw: monthlyKW[m]
    }));

    return res.status(200).json({
      status: "Success",
      data: {
        total: totalKwSum,
        chartData: finalChartData
      }
    });

  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getRevenueGrowth = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const matchStage = {
      isActive: { $ne: false },
    };

    matchStage.createdAt = {
      $gte: new Date(`${targetYear}-01-01T00:00:00.000Z`),
      $lte: new Date(`${targetYear}-12-31T23:59:59.999Z`)
    };

    if (req.leadScope === "own" && req.user && req.user._id) {
      matchStage.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    const growthData = await LEAD.find(matchStage).lean();

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let monthlyRevenue = Object.fromEntries(months.map(m => [m, 0]));
    let totalRevenue = 0;

    for (const lead of growthData) {
      if (lead.createdAt) {
        const d = new Date(lead.createdAt);
        const monthLabel = months[d.getMonth()];
        const amt = parseFloat(lead.paymentAmount || 0) || 0;
        monthlyRevenue[monthLabel] += amt;
        totalRevenue += amt;
      }
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const displayMonths = targetYear === currentYear ? months.slice(0, currentMonth + 1) : targetYear < currentYear ? months : [];

    const finalChartData = displayMonths.map(m => ({
      name: m,
      amt: monthlyRevenue[m],
      lineAmt: monthlyRevenue[m] > 0 ? monthlyRevenue[m] * 1.08 : 0
    }));

    return res.status(200).json({
      status: "Success",
      data: {
        total: totalRevenue,
        chartData: finalChartData
      }
    });

  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getSalesWinRate = async (req, res) => {
  try {
    const { timeframe } = req.query; // 'month', 'week', 'year', 'all'
    const matchStage = {
      isActive: { $ne: false },
    };

    // Apply timeframe filter
    if (timeframe && timeframe !== 'all') {
      let startDate = moment();
      if (timeframe === 'month') {
        startDate = startDate.startOf('month');
      } else if (timeframe === 'week') {
        startDate = startDate.startOf('isoWeek');
      } else if (timeframe === 'year') {
        startDate = startDate.startOf('year');
      }
      matchStage.createdAt = { $gte: startDate.toDate() };
    }

    if (req.leadScope === "own" && req.user && req.user._id) {
      matchStage.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    const salesData = await LEAD.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          assignedToObjId: {
            $convert: {
              input: "$assignedTo",
              to: "objectId",
              onError: null,
              onNull: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "leadstatuses",
          localField: "leadStatus",
          foreignField: "_id",
          as: "statusObj"
        }
      },
      { $unwind: { path: "$statusObj", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "assignedToObjId",
          foreignField: "_id",
          as: "staffObj"
        }
      },
      { $unwind: { path: "$staffObj", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          statusCategory: {
            $switch: {
              branches: [
                {
                  case: { $regexMatch: { input: { $toLower: "$statusObj.name" }, regex: /won/i } },
                  then: "won"
                },
                {
                  case: { $regexMatch: { input: { $toLower: "$statusObj.name" }, regex: /lost/i } },
                  then: "lost"
                }
              ],
              default: "inProgress"
            }
          }
        }
      },
      {
        $group: {
          _id: {
            staffId: "$assignedTo",
            staffName: "$staffObj.fullName",
            statusCategory: "$statusCategory"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.staffId",
          name: { $first: "$_id.staffName" },
          statuses: {
            $push: {
              category: "$_id.statusCategory",
              count: "$count"
            }
          }
        }
      }
    ]);

    // Format the response
    const formattedData = salesData.map(staff => {
      let won = 0;
      let lost = 0;
      let inProgress = 0;

      staff.statuses.forEach(s => {
        if (s.category === 'won') won = s.count;
        if (s.category === 'lost') lost = s.count;
        if (s.category === 'inProgress') inProgress = s.count;
      });

      return {
        staffId: staff._id,
        name: staff.name || 'Unassigned',
        won,
        lost,
        inProgress,
        total: won + lost + inProgress
      };
    });

    // Sort by total leads descending
    formattedData.sort((a, b) => b.total - a.total);

    return res.status(200).json({
      status: "Success",
      data: formattedData
    });

  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};

exports.getLeadsBySource = async (req, res) => {
  try {
    const matchStage = {
      isActive: { $ne: false },
    };

    if (req.leadScope === "own" && req.user && req.user._id) {
      matchStage.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    const sourceData = await LEAD.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          leadSourceObjId: {
            $convert: {
              input: "$leadrefrance",
              to: "objectId",
              onError: null,
              onNull: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "leadsources",
          localField: "leadSourceObjId",
          foreignField: "_id",
          as: "sourceObj"
        }
      },
      { $unwind: { path: "$sourceObj", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$sourceObj.name",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const formattedData = sourceData.map(item => ({
      name: item._id || "Unknown",
      count: item.count
    }));

    return res.status(200).json({
      status: "Success",
      data: formattedData
    });

  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: error.message,
    });
  }
};
