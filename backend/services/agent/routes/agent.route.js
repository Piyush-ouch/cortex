import express from "express";
import { chat } from "../controllers/agent.controller.js";
import { uploadDocument, getDocuments, deleteDocument } from "../controllers/kb.controller.js";
import { getCustomAgents, createCustomAgent, deleteCustomAgent } from "../controllers/customAgent.controller.js";
import { autoFixCode } from "../controllers/autoFix.controller.js";
import multer from "../config/multer.js";

const router = express.Router();

router.post("/chat", multer.single("file"), chat);
router.post("/auto-fix", autoFixCode);

// Knowledge Base routes
router.post("/kb/upload", multer.single("file"), uploadDocument);
router.get("/kb", getDocuments);
router.delete("/kb/:id", deleteDocument);

// Custom Agents & Marketplace routes
router.get("/custom-agents", getCustomAgents);
router.post("/custom-agents", createCustomAgent);
router.delete("/custom-agents/:id", deleteCustomAgent);

export default router;