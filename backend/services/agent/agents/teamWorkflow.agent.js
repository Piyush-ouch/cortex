import pptxgen from "pptxgenjs";
import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { searchTool } from "../utils/tavily.js";
import { getModel } from "../utils/model.js";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { getDownloadUrl } from "../utils/getDownloadUrl.js";

function cleanCode(code = "") {
  return code
    .replace(/```[\w-]*\n?/g, "")
    .replace(/```/g, "")
    .trim();
}

export const teamWorkflowAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId, "coding");
    await deductCredits(state.userId, "coding");

    const llm = getModel("coding");

    // Phase 1: Search Agent Execution
    console.log("Team Workflow Phase 1: Web Search Execution");
    let searchResultsText = "";
    let searchImages = [];
    try {
      const searchResults = await searchTool.invoke({ query: state.prompt });
      searchResultsText = typeof searchResults === "string" ? searchResults : JSON.stringify(searchResults);
      if (searchResults?.images) {
        searchImages = searchResults.images;
      }
    } catch (searchErr) {
      console.error("Team Workflow Search Error:", searchErr.message);
    }

    // Phase 2: Coding Agent Execution (Prototype Web App)
    console.log("Team Workflow Phase 2: Code Generation");
    const codingPrompt = `You are CortexAI Lead Software Engineer in a Multi-Agent Team.

User Goal: ${state.prompt}

Market & Web Research Context:
${searchResultsText}

Generate a complete, modern single-page prototype web application (HTML, CSS, JS).

Return ONLY:
FILE: index.html
...
FILE: style.css
...
FILE: script.js
...
`;

    const codingResponse = await llm.invoke(codingPrompt);
    const codeContent = codingResponse.content?.trim() || "";

    const files = [];
    const matches = [
      ...codeContent.matchAll(
        /FILE:\s*([^\n]+)\n([\s\S]*?)(?=\nFILE:\s*[^\n]+\n|$)/g
      )
    ];

    if (matches.length) {
      matches.forEach((match) => {
        files.push({
          name: match[1].trim(),
          content: cleanCode(match[2])
        });
      });
    } else {
      files.push({
        name: "index.html",
        content: `<!DOCTYPE html><html><head><title>Prototype</title></head><body><h1>${state.prompt}</h1></body></html>`
      });
    }

    // Phase 3: PPT Agent Execution (Presentation Deck)
    console.log("Team Workflow Phase 3: Presentation Deck Generation");
    const ppt = new pptxgen();
    ppt.layout = "LAYOUT_WIDE";
    ppt.author = "CortexAI Multi-Agent Team";
    ppt.title = state.prompt;

    // Slide 1: Cover
    const slide1 = ppt.addSlide();
    slide1.background = { color: "0F172A" };
    slide1.addText(state.prompt.slice(0, 60), {
      x: 0.7, y: 2.0, w: 11.9, h: 1.2,
      fontSize: 32, bold: true, color: "FFFFFF", align: "center"
    });
    slide1.addText("Multi-Agent Team Workflow Deliverable • CortexAI", {
      x: 0.7, y: 3.4, w: 11.9, h: 0.5,
      fontSize: 16, color: "94A3B8", align: "center"
    });

    // Slide 2: Market Research Insights
    const slide2 = ppt.addSlide();
    slide2.background = { color: "FFFFFF" };
    slide2.addText("🌐 Phase 1: Market & Research Insights", {
      x: 0.6, y: 0.4, w: 11.6, h: 0.6,
      fontSize: 24, bold: true, color: "2563EB"
    });
    slide2.addText(searchResultsText.slice(0, 500) || "Comprehensive web analysis completed.", {
      x: 0.6, y: 1.2, w: 11.6, h: 5.0,
      fontSize: 14, color: "1E293B"
    });

    // Slide 3: Web Prototype Summary
    const slide3 = ppt.addSlide();
    slide3.background = { color: "FFFFFF" };
    slide3.addText("💻 Phase 2: Web Prototype Architecture", {
      x: 0.6, y: 0.4, w: 11.6, h: 0.6,
      fontSize: 24, bold: true, color: "2563EB"
    });
    slide3.addText(`Files Generated:\n${files.map(f => `• ${f.name}`).join("\n")}`, {
      x: 0.6, y: 1.2, w: 11.6, h: 5.0,
      fontSize: 16, color: "1E293B"
    });

    const pptFileName = `team-workflow-${Date.now()}.pptx`;
    const pptBuffer = await ppt.write({ outputType: "nodebuffer" });

    await uploadToS3(
      pptBuffer,
      pptFileName,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );

    const pptDownloadUrl = await getDownloadUrl(pptFileName, 600);

    const summaryResponse = `# 🤝 Multi-Agent Team Workflow Completed

## 🌐 Phase 1: Web & Market Research
${searchResultsText.slice(0, 400)}...

---

## 💻 Phase 2: Web Prototype Created
Generated interactive single-page web application files:
${files.map(f => `- \`${f.name}\``).join("\n")}

*(Open the Artifact Panel on the right to preview and test the prototype live)*

---

## 📊 Phase 3: Stakeholder Presentation Deck
📥 **[Download Stakeholder PPT Deck](${pptDownloadUrl})** *(Link valid for 10 minutes)*
`;

    return {
      ...state,
      response: summaryResponse,
      images: searchImages,
      artifacts: [
        {
          id: Date.now(),
          type: "project",
          title: `Team Prototype: ${state.prompt.slice(0, 30)}`,
          files,
          createdAt: new Date().toISOString()
        }
      ]
    };
  } catch (error) {
    console.error("Team Workflow Agent Error:", error);
    return {
      ...state,
      response: `❌ Multi-Agent Team Workflow failed: ${error.message}`
    };
  }
};
