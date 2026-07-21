import { Document } from "@langchain/core/documents";
import { getVectorStore, addDocumentsToVectorStore } from "./vectorStore.js";
import { getModel } from "./model.js";

function getCollectionName(userId) {
  const safeUserId = String(userId || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "");
  return `user-memory-${safeUserId}`;
}

export const getRelevantUserMemories = async (userId, query, limit = 5) => {
  if (!userId || !query) return [];

  const collectionName = getCollectionName(userId);
  try {
    const store = getVectorStore(collectionName);
    const results = await store.similaritySearch(query, limit);
    return results.map(doc => doc.pageContent).filter(Boolean);
  } catch (err) {
    // Collection does not exist yet or Qdrant unavailable
    return [];
  }
};

export const buildMemoryContextPrompt = (memories = []) => {
  if (!Array.isArray(memories) || memories.length === 0) return "";

  const memoryList = memories.map(m => `• ${m}`).join("\n");
  return `
=========================
USER PERSONALIZED MEMORIES & PREFERENCES
=========================
The user has established the following long-term preferences, coding guidelines, and rules across sessions:
${memoryList}

Instructions: Respect and apply these user preferences naturally in your response whenever relevant.
`;
};

export const extractAndStoreUserMemories = async (userId, prompt, response) => {
  if (!userId || !prompt) return [];

  try {
    const llm = getModel("router");
    const extractionPrompt = `You are an AI Memory Extractor for Cortex AI.

Analyze the user's input and AI response below. Extract any EXPLICIT or STRONGLY IMPLIED user preferences, coding guidelines, preferred tech stacks, architectural rules, or corporate identity details.

User Input:
${prompt}

AI Response:
${typeof response === 'string' ? response.slice(0, 500) : ''}

=========================
RULES
=========================
1. Extract ONLY facts about the user's permanent preferences, style guidelines, tech stack choices, or rules (e.g. "User prefers Tailwind CSS v4", "User uses TypeScript", "User prefers functional components").
2. Do NOT extract one-off transient questions (e.g. "What is the weather?").
3. Format each memory as a short, clear statement.
4. If no long-term preferences or facts are expressed, return ONLY the word "NONE".

Return format:
MEMORY: User statement 1
MEMORY: User statement 2`;

    const res = await llm.invoke(extractionPrompt);
    const content = res?.content?.trim() || "";

    if (content === "NONE" || !content.includes("MEMORY:")) return [];

    const lines = content
      .split("\n")
      .map(line => line.replace(/^MEMORY:\s*/i, "").trim())
      .filter(line => line.length > 5);

    if (lines.length === 0) return [];

    const collectionName = getCollectionName(userId);
    const docs = lines.map(fact => new Document({
      pageContent: fact,
      metadata: {
        userId,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString()
      }
    }));

    await addDocumentsToVectorStore(collectionName, docs);
    return lines;
  } catch (err) {
    console.error("User Memory Extraction Error:", err.message);
    return [];
  }
};

export const getAllUserMemories = async (userId) => {
  if (!userId) return [];
  const collectionName = getCollectionName(userId);
  try {
    const store = getVectorStore(collectionName);
    const results = await store.similaritySearch("", 30);
    return results.map((doc, idx) => ({
      id: doc.metadata?.id || `mem-${idx}`,
      content: doc.pageContent,
      createdAt: doc.metadata?.createdAt || new Date().toISOString()
    }));
  } catch (err) {
    return [];
  }
};
