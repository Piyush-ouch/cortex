import razorpay from "../config/razorpay.js";
import { PLANS } from "../config/plans.js";
import Payment from "../models/payment.model.js";
import UsageLog from "../models/usageLog.model.js";
import crypto from "crypto";
import axios from "axios";

export const createOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.headers["x-user-id"];
    const selectedPlan = PLANS[plan];

    if (!selectedPlan) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan"
      });
    }

    const order = await razorpay.orders.create({
      amount: selectedPlan.amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });

    await Payment.create({
      userId,
      orderId: order.id,
      amount: selectedPlan.amount,
      credits: selectedPlan.credits,
      plan: selectedPlan.id,
      currency: order.currency,
      status: "created"
    });

    return res.json({
      success: true,
      order,
      plan: selectedPlan
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed"
      });
    }

    const payment = await Payment.findOne({ orderId: razorpay_order_id });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    payment.status = "paid";
    payment.paymentId = razorpay_payment_id;
    await payment.save();

    await axios.patch(`${process.env.AUTH_SERVICE}/internal/update-plan`, {
      userId: payment.userId,
      plan: payment.plan,
      credits: payment.credits
    });

    return res.json({
      success: true,
      message: "Payment verified successfully"
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const transactions = await Payment.find({ userId }).sort({ createdAt: -1 }).limit(10);

    const usageAggregation = await UsageLog.aggregate([
      { $match: { userId } },
      { $group: { _id: "$agent", totalSpent: { $sum: "$creditsSpent" } } }
    ]);

    const usageByAgent = {
      chat: 0,
      coding: 0,
      search: 0,
      pdf: 0,
      ppt: 0,
      image: 0,
      vision: 0,
      pdf_rag: 0
    };

    let totalCreditsSpent = 0;
    usageAggregation.forEach((item) => {
      if (item._id && usageByAgent.hasOwnProperty(item._id)) {
        usageByAgent[item._id] = item.totalSpent;
      }
      totalCreditsSpent += item.totalSpent;
    });

    return res.json({
      success: true,
      usageByAgent,
      totalCreditsSpent,
      transactions
    });
  } catch (error) {
    console.log("Get Analytics Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};