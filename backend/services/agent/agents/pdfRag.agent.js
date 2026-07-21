import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createVectorStore, getVectorStore } from "../utils/vectorStore.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModel } from "../utils/model.js";
import { QdrantVectorStore } from "@langchain/qdrant";

export const pdfRagAgent = async (state) => {
  let tempCollectionName = null;
  const llm = getModel("pdf-rag");

  try {
    // Mode A: Single attached file in request
    if (state.file && state.file.path) {
      const buffer = fs.readFileSync(state.file.path);
      let text = "";

      if (state.file.mimetype === "application/pdf" || state.file.originalname.endsWith(".pdf")) {
        const result = await pdf(buffer);
        text = result.text;
      } else {
        text = buffer.toString("utf-8");
      }

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      });

      const docs = await splitter.createDocuments([text]);
      tempCollectionName = `pdf-${Date.now()}`;

      const vectorStore = await createVectorStore(tempCollectionName, docs);
      const relevantDocs = await vectorStore.similaritySearch(state.prompt, 5);
      const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");

      const messages = [
        new SystemMessage(`
You are CortexAI PDF Assistant.

Rules:
- Answer ONLY using the uploaded document context below.
- Never make up information.
- If the answer is not present in the document, reply: "I couldn't find this information in the uploaded PDF."
- Use Markdown formatting.
`),
        new HumanMessage(`
Context:
${context}

Question:
${state.prompt}
`)
      ];

      const response = await llm.invoke(messages);

      return {
        ...state,
        response: response.content
      };
    }

    // Mode B: Persistent Knowledge Base Search
    const userId = state.userId;
    if (!userId) {
      return {
        ...state,
        response: "Please log in to query your Knowledge Base."
      };
    }

    const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, "");
    const kbCollectionName = `kb-${safeUserId}`;

    let relevantDocs = [];
    try {
      const store = getVectorStore(kbCollectionName);
      relevantDocs = await store.similaritySearch(state.prompt, 6);
    } catch (err) {
      console.log("No persistent KB vector store found for user:", err.message);
    }

    if (!relevantDocs || relevantDocs.length === 0) {
      return {
        ...state,
        response: "📚 Your Knowledge Base currently has no matching document context. Please upload documents to your Knowledge Base using the sidebar."
      };
    }

    const context = relevantDocs
      .map((doc, idx) => `[Source ${idx + 1}: ${doc.metadata?.source || "Uploaded Document"}]\n${doc.pageContent}`)
      .join("\n\n---\n\n");

    const sources = [...new Set(relevantDocs.map(d => d.metadata?.source).filter(Boolean))];

    const messages = [
      new SystemMessage(`
You are CortexAI Persistent Knowledge Base Assistant.

Rules:
- Answer the user's question using ONLY the provided Knowledge Base documents.
- Always include citations pointing to the source documents when referencing information.
- Use clear Markdown formatting with headings and bullet points.
- If the required answer cannot be found in the context, politely inform the user.
`),
      new HumanMessage(`
Knowledge Base Context:
${context}

User Question:
${state.prompt}
`)
    ];

    const response = await llm.invoke(messages);

    const sourceCitationText = sources.length > 0
      ? `\n\n---\n**📚 Referenced Documents:** ${sources.map(s => `\`${s}\``).join(", ")}`
      : "";

    return {
      ...state,
      response: `${response.content}${sourceCitationText}`
    };
  } catch (error) {
    console.error("pdfRagAgent Error:", error);
    return {
      ...state,
      response: `Failed to process document query: ${error.message}`
    };
  } finally {
    try {
      if (state.file?.path && fs.existsSync(state.file.path)) {
        fs.unlinkSync(state.file.path);
      }
      if (tempCollectionName) {
        await QdrantVectorStore.deleteCollection(tempCollectionName);
      }
    } catch (err) {
      console.log("Cleanup error in pdfRagAgent:", err.message);
    }
  }
};