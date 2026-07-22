import { StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state.js";
import { routerNode } from "./router.node.js";
import { chatAgent } from "../agents/chat.agent.js";
import { codingAgent } from "../agents/coding.agent.js";
import { searchAgent } from "../agents/search.agent.js";
import { pdfAgent } from "../agents/pdf.agent.js";
import { pptAgent } from "../agents/ppt.agent.js";
import { imageAgent } from "../agents/imageGen.agent.js";
import { visionAgent } from "../agents/vision.agent.js";
import { pdfRagAgent } from "../agents/pdfRag.agent.js";
import { teamWorkflowAgent } from "../agents/teamWorkflow.agent.js";
import { databaseAgent } from "../agents/database.agent.js";

const workflow = new StateGraph(AgentState);

workflow.addNode("router", routerNode);
workflow.addNode("chat", chatAgent);
workflow.addNode("coding", codingAgent);
workflow.addNode("database", databaseAgent);
workflow.addNode("search", searchAgent);
workflow.addNode("pdf", pdfAgent);
workflow.addNode("ppt", pptAgent);
workflow.addNode("image", imageAgent);
workflow.addNode("vision", visionAgent);
workflow.addNode("pdf_rag", pdfRagAgent);
workflow.addNode("team_workflow", teamWorkflowAgent);

workflow.addEdge("__start__", "router");

workflow.addConditionalEdges(
  "router",
  (state) => {
    switch (state.agent) {
      case "search":
        return "search";
      case "coding":
        return "coding";
      case "database":
        return "database";
      case "pdf":
        return "pdf";
      case "ppt":
        return "ppt";
      case "image":
        return "image";
      case "vision":
        return "vision";
      case "pdf_rag":
        return "pdf_rag";
      case "team_workflow":
        return "team_workflow";
      default:
        return "chat";
    }
  },
  {
    chat: "chat",
    search: "search",
    coding: "coding",
    database: "database",
    pdf: "pdf",
    ppt: "ppt",
    image: "image",
    vision: "vision",
    pdf_rag: "pdf_rag",
    team_workflow: "team_workflow"
  }
);

workflow.addEdge("coding", "__end__");
workflow.addEdge("database", "__end__");
workflow.addEdge("image", "__end__");
workflow.addEdge("search", "chat");
workflow.addEdge("pdf", "__end__");
workflow.addEdge("ppt", "__end__");
workflow.addEdge("chat", "__end__");
workflow.addEdge("vision", "__end__");
workflow.addEdge("pdf_rag", "__end__");
workflow.addEdge("team_workflow", "__end__");

export const graph = workflow.compile();