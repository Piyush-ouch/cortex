import mongoose from "mongoose";

const usageLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  agent: {
    type: String,
    required: true,
    enum: ["chat", "coding", "search", "pdf", "ppt", "image", "vision", "pdf_rag"]
  },
  creditsSpent: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.UsageLog || mongoose.model("UsageLog", usageLogSchema);
