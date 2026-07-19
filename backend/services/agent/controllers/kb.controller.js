import fs from "fs";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import KnowledgeDocument from "../models/knowledgeDocument.model.js";
import { addDocumentsToVectorStore } from "../utils/vectorStore.js";

export const uploadDocument = async (req, res, next) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const mimetype = req.file.mimetype;
    const buffer = fs.readFileSync(filePath);

    let extractedText = "";

    if (mimetype === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
      const pdf = new PDFParse({ data: buffer });
      const pdfResult = await pdf.getText();
      extractedText = pdfResult.text;
    } else {
      extractedText = buffer.toString("utf-8");
    }

    if (!extractedText || !extractedText.trim()) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, message: "File contains no readable text." });
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    });

    const docs = await splitter.createDocuments(
      [extractedText],
      [{ source: fileName, userId }]
    );

    // Sanitize user ID for Qdrant collection name compliance
    const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, "");
    const collectionName = `kb-${safeUserId}`;

    await addDocumentsToVectorStore(collectionName, docs);

    const docRecord = await KnowledgeDocument.create({
      userId,
      title: fileName.replace(/\.[^/.]+$/, ""),
      fileName,
      fileType: mimetype || "text/plain",
      chunkCount: docs.length,
      collectionName
    });

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.json({
      success: true,
      document: docRecord,
      message: `Document "${fileName}" successfully indexed (${docs.length} chunks).`
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Upload KB Document Error:", error);
    next(error);
  }
};

export const getDocuments = async (req, res, next) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const documents = await KnowledgeDocument.find({ userId }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      documents
    });
  } catch (error) {
    console.error("Get KB Documents Error:", error);
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const userId = req.headers["x-user-id"];
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const document = await KnowledgeDocument.findOneAndDelete({ _id: id, userId });
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.json({
      success: true,
      message: `Document "${document.fileName}" removed from Knowledge Base.`
    });
  } catch (error) {
    console.error("Delete KB Document Error:", error);
    next(error);
  }
};
