import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getModel } from "../utils/model.js";
import { addMessage } from "../utils/memory.js";
import axios from "axios";

function cleanCode(code = "") {
  return code
    .replace(/```[\w-]*\n?/g, "")
    .replace(/```/g, "")
    .trim();
}

export const autoFixCode = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized user session" });
    }

    const { conversationId, artifactTitle, files, error } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid payload: 'files' array is required." });
    }

    if (!error || (!error.message && !error.stack && (!error.logs || error.logs.length === 0))) {
      return res.status(400).json({ success: false, message: "Invalid payload: 'error' stack/logs are required." });
    }

    // Rate limit check and credit deduction
    try {
      await checkAgentLimit(userId, "coding");
      await deductCredits(userId, "coding");
    } catch (limitErr) {
      return res.status(429).json({ success: false, message: limitErr.message || "Rate limit exceeded." });
    }

    const llm = getModel("coding");

    const formattedFiles = files
      .map(f => `FILE: ${f.name}\n${f.content || ""}`)
      .join("\n\n");

    const errorMessage = error.message || "Unknown runtime exception";
    const errorStack = error.stack ? String(error.stack).slice(0, 1500) : "No stack trace available";
    const consoleLogs = Array.isArray(error.logs) ? error.logs.slice(-10).join("\n") : "No recent logs";

    const prompt = `You are CortexAI Self-Healing AI Debugger & Senior Software Engineer.

A runtime error occurred during the live preview execution of the web project artifact "${artifactTitle || 'Prototype'}".

=========================
CURRENT PROJECT FILES
=========================
${formattedFiles}

=========================
RUNTIME ERROR DETECTED
=========================
Error Message:
${errorMessage}

Stack Trace:
${errorStack}

Console Log Output:
${consoleLogs}

=========================
TASK INSTRUCTIONS
=========================
1. Analyze the root cause of the runtime error, uncaught exception, or syntax issue.
2. Fix the bug across the project files (index.html, style.css, script.js, or React/JS components).
3. Ensure DOM elements, event listeners, variables, and function calls match correctly.
4. Maintain clean, modern, responsive UI design without removing existing functionality.

=========================
OUTPUT REQUIREMENT
=========================
Return ONLY the complete updated code files in exact format:

FILE: filename
[code content]

Do NOT include markdown explanations outside of FILE blocks.
Do NOT output duplicate FILE declarations for the same file.`;

    const response = await llm.invoke(prompt);
    const content = response?.content?.trim() || "";

    const matches = [
      ...content.matchAll(
        /FILE:\s*([^\n]+)\n([\s\S]*?)(?=\nFILE:\s*[^\n]+\n|$)/g
      )
    ];

    const repairedFiles = [];
    if (matches.length > 0) {
      matches.forEach(match => {
        repairedFiles.push({
          name: match[1].trim(),
          content: cleanCode(match[2])
        });
      });
    }

    // Fallback: If AI returned raw code without FILE: header, map it back safely to script.js or index.html
    if (repairedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to parse auto-fix solution. Please retry or refine prompt."
      });
    }

    // Merge repaired files with any untouched original files
    const finalFilesMap = new Map();
    files.forEach(f => finalFilesMap.set(f.name, f.content));
    repairedFiles.forEach(f => finalFilesMap.set(f.name, f.content));

    const updatedFiles = Array.from(finalFilesMap.entries()).map(([name, content]) => ({
      name,
      content
    }));

    const repairSummary = `⚡ **CortexAI Self-Healing Engine** automatically repaired a runtime error:\n> \`${errorMessage}\``;

    if (conversationId) {
      await addMessage(conversationId, "assistant", repairSummary).catch(err =>
        console.error("Memory add error:", err.message)
      );
      axios
        .post(`${process.env.CHAT_SERVICE}/save-message`, {
          conversationId,
          role: "assistant",
          content: repairSummary,
          artifacts: [
            {
              id: Date.now(),
              type: "project",
              title: artifactTitle || "Repaired Project Prototype",
              files: updatedFiles,
              createdAt: new Date().toISOString()
            }
          ]
        })
        .catch(err => console.error("Error saving auto-fix chat message:", err.message));
    }

    return res.json({
      success: true,
      message: "Runtime error successfully auto-fixed by CortexAI Self-Healing Engine",
      summary: repairSummary,
      files: updatedFiles
    });
  } catch (error) {
    console.error("Auto-Fix Controller Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to auto-fix runtime error"
    });
  }
};
