import { searchTool } from "./tavily.js";
import { getModel } from "./model.js";
import pdfkit from "pdfkit";
import pptxgen from "pptxgenjs";
import { uploadToS3 } from "./uploadToS3.js";
import { getDownloadUrl } from "./getDownloadUrl.js";

function cleanCode(code = "") {
  return code
    .replace(/```[\w-]*\n?/g, "")
    .replace(/```/g, "")
    .trim();
}

/**
 * Topologically sorts DAG nodes to determine execution order and detect cycles.
 */
function topologicalSort(nodes = [], edges = []) {
  const inDegree = new Map();
  const adjList = new Map();

  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    adjList.set(n.id, []);
  });

  edges.forEach(e => {
    if (adjList.has(e.source) && inDegree.has(e.target)) {
      adjList.get(e.source).push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });

  const queue = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });

  const sortedIds = [];
  while (queue.length > 0) {
    const curr = queue.shift();
    sortedIds.push(curr);

    const neighbors = adjList.get(curr) || [];
    neighbors.forEach(neighbor => {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    });
  }

  if (sortedIds.length !== nodes.length) {
    throw new Error("Invalid Workflow: Cycle detected in Visual Canvas Graph (DAG required).");
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return sortedIds.map(id => nodeMap.get(id)).filter(Boolean);
}

export const executeCustomWorkflowEngine = async ({
  prompt,
  nodes = [],
  edges = [],
  userId,
  onStatusUpdate = () => {}
}) => {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error("Workflow contains no executable nodes.");
  }

  if (nodes.length > 15) {
    throw new Error("Workflow node limit exceeded (Max 15 nodes allowed per visual graph).");
  }

  const sortedNodes = topologicalSort(nodes, edges);
  const nodeOutputs = new Map();

  let finalResponseText = "";
  let searchResultsText = "";
  let searchImages = [];
  const files = [];
  const artifacts = [];

  for (let i = 0; i < sortedNodes.length; i++) {
    const node = sortedNodes[i];
    const nodeType = String(node.type || node.label || "").toLowerCase();
    const nodeId = node.id;
    const nodeLabel = node.label || nodeType;

    onStatusUpdate({
      nodeId,
      status: "running",
      label: `Executing Node [${i + 1}/${sortedNodes.length}]: ${nodeLabel}...`
    });

    // Gather predecessor outputs
    const predecessorEdges = edges.filter(e => e.target === nodeId);
    const parentContexts = predecessorEdges
      .map(e => nodeOutputs.get(e.source))
      .filter(Boolean)
      .join("\n\n---\n\n");

    try {
      if (nodeType.includes("search")) {
        let query = prompt;
        if (parentContexts) query = `${prompt}\nContext: ${parentContexts.slice(0, 500)}`;

        const searchRes = await searchTool.invoke({ query });
        searchResultsText = typeof searchRes === "string" ? searchRes : JSON.stringify(searchRes);
        if (searchRes?.images) searchImages = searchRes.images;

        nodeOutputs.set(nodeId, `Web Search Insights:\n${searchResultsText.slice(0, 1500)}`);
        finalResponseText += `\n\n### 🌐 Web Search Completed\n${searchResultsText.slice(0, 400)}...`;

      } else if (nodeType.includes("code") || nodeType.includes("coding")) {
        const llm = getModel("coding");
        const codingPrompt = `You are CortexAI Software Architect executing visual workflow node.
User Goal: ${prompt}

Prior Context & Inputs:
${parentContexts || searchResultsText || "Build a complete single-page app"}

Generate a modern single-page prototype (index.html, style.css, script.js).

Return ONLY:
FILE: index.html
...
FILE: style.css
...
FILE: script.js
...`;

        const codeRes = await llm.invoke(codingPrompt);
        const codeContent = codeRes.content?.trim() || "";

        const matches = [
          ...codeContent.matchAll(
            /FILE:\s*([^\n]+)\n([\s\S]*?)(?=\nFILE:\s*[^\n]+\n|$)/g
          )
        ];

        if (matches.length > 0) {
          matches.forEach(match => {
            files.push({
              name: match[1].trim(),
              content: cleanCode(match[2])
            });
          });
        } else {
          files.push({
            name: "index.html",
            content: `<!DOCTYPE html><html><head><title>${prompt}</title></head><body><h1>${prompt}</h1></body></html>`
          });
        }

        nodeOutputs.set(nodeId, `Generated Web App Prototype Files:\n${files.map(f => f.name).join(", ")}`);
        finalResponseText += `\n\n### 💻 Web Application Generated\nInteractive prototype created with ${files.length} files. *(View Artifact Panel)*`;

      } else if (nodeType.includes("pdf")) {
        const doc = new pdfkit();
        const buffers = [];

        doc.on("data", chunk => buffers.push(chunk));
        doc.fontSize(22).fillColor("#2563EB").text("CortexAI Visual Flow Deliverable", { align: "center" });
        doc.moveDown();
        doc.fontSize(14).fillColor("#1E293B").text(`Goal: ${prompt}`);
        doc.moveDown();
        doc.fontSize(11).fillColor("#475569").text(`Execution Details:\n${parentContexts || "Custom pipeline completed successfully."}`);
        doc.end();

        await new Promise((resolve, reject) => {
          doc.on("end", resolve);
          doc.on("error", reject);
        });

        const pdfBuffer = Buffer.concat(buffers);
        const pdfFileName = `cortex-canvas-${Date.now()}.pdf`;

        await uploadToS3(pdfBuffer, pdfFileName, "application/pdf");
        const pdfDownloadUrl = await getDownloadUrl(pdfFileName, 600);

        nodeOutputs.set(nodeId, `PDF Document Generated: ${pdfDownloadUrl}`);
        finalResponseText += `\n\n### 📄 PDF Document Exported\n📥 **[Download PDF Report](${pdfDownloadUrl})**`;

      } else if (nodeType.includes("ppt") || nodeType.includes("presentation")) {
        const ppt = new pptxgen();
        ppt.layout = "LAYOUT_WIDE";
        ppt.title = prompt;

        const slide = ppt.addSlide();
        slide.background = { color: "0F172A" };
        slide.addText(prompt.slice(0, 60), { x: 0.7, y: 2.0, w: 11.9, h: 1.2, fontSize: 32, bold: true, color: "FFFFFF", align: "center" });

        const pptFileName = `cortex-canvas-${Date.now()}.pptx`;
        const pptBuffer = await ppt.write({ outputType: "nodebuffer" });

        await uploadToS3(pptBuffer, pptFileName, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        const pptDownloadUrl = await getDownloadUrl(pptFileName, 600);

        nodeOutputs.set(nodeId, `PowerPoint Presentation Generated: ${pptDownloadUrl}`);
        finalResponseText += `\n\n### 📊 Presentation Deck Exported\n📥 **[Download Slide Deck](${pptDownloadUrl})**`;

      } else {
        // Default Summarizer / Chat node
        const llm = getModel("chat");
        const chatRes = await llm.invoke(`Summarize and consolidate output for node [${nodeLabel}]:
User Goal: ${prompt}
Input Context:
${parentContexts || "Process task step"}`);

        const textOutput = chatRes.content?.trim() || "";
        nodeOutputs.set(nodeId, textOutput);
        finalResponseText += `\n\n### 🤖 ${nodeLabel}\n${textOutput}`;
      }

      onStatusUpdate({
        nodeId,
        status: "completed",
        label: `Completed Node [${i + 1}/${sortedNodes.length}]: ${nodeLabel}`
      });

    } catch (nodeErr) {
      console.error(`Error in Node [${nodeId}]:`, nodeErr.message);
      onStatusUpdate({
        nodeId,
        status: "failed",
        label: `Failed Node [${nodeId}]: ${nodeErr.message}`
      });
      nodeOutputs.set(nodeId, `Node execution failed: ${nodeErr.message}`);
    }
  }

  if (files.length > 0) {
    artifacts.push({
      id: Date.now(),
      type: "project",
      title: `Canvas App: ${prompt.slice(0, 30)}`,
      files,
      createdAt: new Date().toISOString()
    });
  }

  return {
    response: finalResponseText.trim() || "# 🎨 Visual Flow Execution Completed",
    images: searchImages,
    artifacts
  };
};
