import mongoose from "mongoose";

const knowledgeDocumentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  chunkCount: {
    type: Number,
    default: 0
  },
  collectionName: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.KnowledgeDocument || mongoose.model("KnowledgeDocument", knowledgeDocumentSchema);
