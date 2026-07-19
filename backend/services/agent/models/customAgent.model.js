import mongoose from "mongoose";

const customAgentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  systemPrompt: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: "🤖"
  },
  category: {
    type: String,
    default: "General",
    enum: ["Coding", "Writing", "Legal", "Business", "Productivity", "General"]
  },
  temperature: {
    type: Number,
    default: 0.7,
    min: 0.0,
    max: 1.0
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.CustomAgent || mongoose.model("CustomAgent", customAgentSchema);
