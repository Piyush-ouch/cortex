import express from "express";
import { chat } from "../controllers/agent.controller.js";
import { uploadDocument, getDocuments, deleteDocument } from "../controllers/kb.controller.js";
import multer from "../config/multer.js";

const router = express.Router();

router.post("/chat", multer.single("file"), chat);

// Knowledge Base routes
router.post("/kb/upload", multer.single("file"), uploadDocument);
router.get("/kb", getDocuments);
router.delete("/kb/:id", deleteDocument);

export default router;