import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { executeCustomWorkflowEngine } from "../utils/customWorkflow.engine.js";
import { addMessage } from "../utils/memory.js";
import axios from "axios";

export const executeCustomWorkflow = async (req, res, next) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized user session" });
    }

    const { prompt, nodes, edges, conversationId, stream } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: "Prompt is required to execute workflow." });
    }

    if (!Array.isArray(nodes) || nodes.length === 0) {
      return res.status(400).json({ success: false, message: "At least one visual node is required in graph." });
    }

    // Check rate limit & deduct credits based on node count
    try {
      await checkAgentLimit(userId, "coding");
      await deductCredits(userId, "coding");
    } catch (limitErr) {
      return res.status(429).json({ success: false, message: limitErr.message || "Rate limit or credit error." });
    }

    const isStreamReq = req.headers.accept?.includes("text/event-stream") || stream === true || stream === "true";

    if (isStreamReq) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      sendEvent("status", { agent: "team_workflow", label: "Compiling Visual Canvas DAG Graph..." });

      const result = await executeCustomWorkflowEngine({
        prompt,
        nodes,
        edges,
        userId,
        onStatusUpdate: (nodeStatus) => {
          sendEvent("status", {
            agent: "team_workflow",
            label: nodeStatus.label,
            nodeId: nodeStatus.nodeId,
            nodeStatus: nodeStatus.status
          });
        }
      });

      const answer = result.response || "Visual workflow executed successfully.";
      const images = result.images || [];
      const artifacts = result.artifacts || [];

      if (conversationId) {
        await addMessage(conversationId, "assistant", answer).catch(err =>
          console.error("Memory add error:", err.message)
        );
        axios
          .post(`${process.env.CHAT_SERVICE}/save-message`, {
            conversationId,
            role: "assistant",
            content: answer,
            images,
            artifacts
          })
          .catch(err => console.error("Error saving workflow message:", err.message));
      }

      sendEvent("done", {
        success: true,
        answer,
        images,
        artifacts
      });

      return res.end();
    } else {
      const result = await executeCustomWorkflowEngine({
        prompt,
        nodes,
        edges,
        userId
      });

      if (conversationId) {
        await addMessage(conversationId, "assistant", result.response).catch(err =>
          console.error("Memory add error:", err.message)
        );
        axios
          .post(`${process.env.CHAT_SERVICE}/save-message`, {
            conversationId,
            role: "assistant",
            content: result.response,
            images: result.images,
            artifacts: result.artifacts || []
          })
          .catch(err => console.error("Error saving workflow message:", err.message));
      }

      return res.json({
        success: true,
        answer: result.response,
        images: result.images,
        artifacts: result.artifacts || []
      });
    }
  } catch (error) {
    console.error("Execute Custom Workflow Error:", error);
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error.message || "Workflow execution failed" })}\n\n`);
      return res.end();
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};
