import { getAllUserMemories } from "../utils/userMemory.engine.js";
import { addDocumentsToVectorStore } from "../utils/vectorStore.js";
import { Document } from "@langchain/core/documents";

function getCollectionName(userId) {
  const safeUserId = String(userId || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "");
  return `user-memory-${safeUserId}`;
}

export const getUserMemoriesController = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized user session" });
    }

    const memories = await getAllUserMemories(userId);
    return res.json({
      success: true,
      memories
    });
  } catch (error) {
    console.error("Get User Memories Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addUserMemoryController = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { content } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized user session" });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Memory content string is required." });
    }

    const memoryText = content.trim();
    const collectionName = getCollectionName(userId);
    const docId = `mem-${Date.now()}`;

    const doc = new Document({
      pageContent: memoryText,
      metadata: {
        userId,
        id: docId,
        createdAt: new Date().toISOString()
      }
    });

    await addDocumentsToVectorStore(collectionName, [doc]);

    return res.status(201).json({
      success: true,
      message: "Memory preference saved to AI Memory Bank",
      memory: {
        id: docId,
        content: memoryText,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Add User Memory Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
