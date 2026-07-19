import CustomAgent from "../models/customAgent.model.js";

const DEFAULT_MARKETPLACE_AGENTS = [
  {
    userId: "system",
    name: "Senior React Reviewer",
    avatar: "⚛️",
    category: "Coding",
    description: "Expert React code reviewer auditing component performance, hooks, and clean architecture.",
    systemPrompt: "You are a Senior Principal React Architect. Review code for hooks dependency arrays, memoization, performance bottlenecks, clean component separation, and accessibility.",
    temperature: 0.3,
    isPublic: true
  },
  {
    userId: "system",
    name: "Legal Document Summarizer",
    avatar: "⚖️",
    category: "Legal",
    description: "Legal AI contract reviewer extracting clauses, obligations, and risk factors.",
    systemPrompt: "You are an expert Legal AI Assistant. Analyze uploaded document text/context, extract key obligations, liability clauses, termination conditions, and highlight risk factors.",
    temperature: 0.2,
    isPublic: true
  },
  {
    userId: "system",
    name: "SaaS Copywriter",
    avatar: "✍️",
    category: "Writing",
    description: "High-converting marketing copywriter for SaaS landing pages and emails.",
    systemPrompt: "You are a World-Class SaaS Copywriter. Craft punchy, persuasive landing page headlines, subheadings, feature callouts, and call-to-action copy.",
    temperature: 0.8,
    isPublic: true
  },
  {
    userId: "system",
    name: "Python Data Architect",
    avatar: "🐍",
    category: "Coding",
    description: "Specialized Python backend architect for FastAPI, Pandas, and async pipelines.",
    systemPrompt: "You are a Senior Python Backend Architect. Write clean, type-hinted, high-performance Python code using FastAPI, Pydantic, and async idioms.",
    temperature: 0.3,
    isPublic: true
  }
];

export const getCustomAgents = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let userAgents = await CustomAgent.find({ userId }).sort({ createdAt: -1 });
    let publicAgents = await CustomAgent.find({ isPublic: true });

    // Seed default marketplace templates if publicAgents is empty
    if (publicAgents.length === 0) {
      await CustomAgent.insertMany(DEFAULT_MARKETPLACE_AGENTS);
      publicAgents = await CustomAgent.find({ isPublic: true });
    }

    return res.json({
      success: true,
      userAgents,
      marketplaceAgents: publicAgents
    });
  } catch (error) {
    console.error("Get Custom Agents Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createCustomAgent = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name, description, systemPrompt, avatar, category, temperature } = req.body;

    if (!name || !systemPrompt) {
      return res.status(400).json({ success: false, message: "Name and System Prompt are required." });
    }

    const agent = await CustomAgent.create({
      userId,
      name,
      description: description || "",
      systemPrompt,
      avatar: avatar || "🤖",
      category: category || "General",
      temperature: typeof temperature === "number" ? temperature : 0.7,
      isPublic: false
    });

    return res.status(201).json({
      success: true,
      agent
    });
  } catch (error) {
    console.error("Create Custom Agent Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCustomAgent = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { id } = req.params;

    const agent = await CustomAgent.findOneAndDelete({ _id: id, userId });
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found or unauthorized." });
    }

    return res.json({
      success: true,
      message: "Agent deleted successfully."
    });
  } catch (error) {
    console.error("Delete Custom Agent Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
