import express from "express";
import { createOrder, verifyPayment, getAnalytics } from "../controllers/billing.controller.js";

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get("/analytics", getAnalytics);

export default router;