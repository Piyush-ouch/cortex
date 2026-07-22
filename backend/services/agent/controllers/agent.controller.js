import redis from "../../../shared/redis/redis.js";
import { graph } from "../graph/supervisor.graph.js";
import { addMessage } from "../utils/memory.js";
import axios from "axios";

const NODE_STATUS_LABELS = {
  router: { agent: "router", label: "Analyzing intent & routing query..." },
  search: { agent: "search", label: "Searching web via Tavily..." },
  chat: { agent: "chat", label: "Generating response..." },
  coding: { agent: "coding", label: "Building code project & artifacts..." },
  database: { agent: "database", label: "Designing database schema, ERD & migrations..." },
  api_designer: { agent: "api_designer", label: "Designing API specifications, Postman collection & mock endpoints..." },
  pdf: { agent: "pdf", label: "Generating PDF document..." },
  ppt: { agent: "ppt", label: "Designing presentation slides..." },
  image: { agent: "image", label: "Generating AI image..." },
  vision: { agent: "vision", label: "Analyzing image content..." },
  pdf_rag: { agent: "pdf_rag", label: "Searching PDF context..." },
  team_workflow: { agent: "team_workflow", label: "Multi-Agent Team Workflow: Executing Search → Coding → PPT Chain..." }
};


export const chat = async (req, res, next) => {
  try {
    const { prompt, conversationId, agent, stream } = req.body;
    const userId = req.headers["x-user-id"];
    const acceptsSse = req.headers.accept?.includes("text/event-stream");
    const isStreamReq = acceptsSse || stream === true || stream === "true";

    await addMessage(conversationId, "user", prompt);
    axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
      conversationId,
      role: "user",
      content: prompt
    }).catch(err => console.error("Error saving user message:", err.message));

    const initialState = {
      prompt,
      conversationId,
      userId,
      agent,
      file: req.file
    };

    if (isStreamReq) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      sendEvent("status", { agent: "router", label: "Initializing workflow..." });

      let finalResult = null;
      let streamedText = "";

      try {
        const eventStream = graph.streamEvents(initialState, { version: "v2" });
        for await (const event of eventStream) {
          if (event.event === "on_chain_start" && NODE_STATUS_LABELS[event.name]) {
            sendEvent("status", NODE_STATUS_LABELS[event.name]);
          } else if (event.event === "on_chat_model_stream") {
            const content = event.data?.chunk?.content;
            if (typeof content === "string" && content) {
              streamedText += content;
              sendEvent("token", { content });
            } else if (Array.isArray(content)) {
              for (const part of content) {
                if (part.type === "text" && part.text) {
                  streamedText += part.text;
                  sendEvent("token", { content: part.text });
                }
              }
            }
          } else if (event.event === "on_chain_end" && (event.name === "LangGraph" || event.name === "supervisor")) {
            if (event.data?.output) {
              finalResult = event.data.output;
            }
          }
        }
      } catch (streamErr) {
        console.error("StreamEvents error, falling back to graph.invoke:", streamErr.message);
      }

      if (!finalResult) {
        finalResult = await graph.invoke(initialState);
      }

      const answer = finalResult?.response || streamedText || "Task completed.";
      const images = finalResult?.images || [];
      const artifacts = finalResult?.artifacts || [];

      await addMessage(conversationId, "assistant", answer);
      axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
        conversationId,
        role: "assistant",
        content: answer,
        images,
        artifacts
      }).catch(err => console.error("Error saving assistant message:", err.message));

      sendEvent("done", {
        success: true,
        answer,
        images,
        artifacts
      });

      return res.end();
    } else {
      const result = await graph.invoke(initialState);

      await addMessage(conversationId, "assistant", result.response);
      axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
        conversationId,
        role: "assistant",
        content: result.response,
        images: result.images,
        artifacts: result.artifacts || []
      }).catch(err => console.error("Error saving assistant message:", err.message));

      return res.json({
        success: true,
        answer: result.response,
        images: result.images,
        artifacts: result.artifacts || []
      });
    }
  } catch (error) {
    console.error("Chat Controller Error:", error);
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error.message || "Internal Server Error" })}\n\n`);
      return res.end();
    }
    next(error);
  }
};