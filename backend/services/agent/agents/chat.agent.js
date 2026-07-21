import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getMemory } from "../utils/memory.js";
import { getModel } from "../utils/model.js";
import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import CustomAgent from "../models/customAgent.model.js";
import { extractAndStoreUserMemories } from "../utils/userMemory.engine.js";

export const chatAgent = async (state) => {
  await checkAgentLimit(state.userId, "chat");
  await deductCredits(state.userId, "chat");

  const llm = getModel("chat");
  const history = await getMemory(state.conversationId);

  let systemPromptText = `You are CortexAI, an intelligent AI assistant.`;

  // Look up custom agent system prompt if customAgent ID is provided or state.agent is a Mongo ID
  if (state.customSystemPrompt) {
    systemPromptText = state.customSystemPrompt;
  } else if (state.agent && state.agent.length === 24) {
    try {
      const customAgent = await CustomAgent.findById(state.agent);
      if (customAgent) {
        systemPromptText = `You are ${customAgent.name}, a specialized AI Agent.\n\n${customAgent.systemPrompt}`;
      }
    } catch (e) {
      console.error("Custom Agent lookup error:", e.message);
    }
  }

  const memoryContextText = state.memoryContext || "";

  const formattedSearchResults = typeof state.searchResults === "string"
    ? state.searchResults
    : JSON.stringify(state.searchResults?.results || state.searchResults, null, 2);

  const searchContext = state.searchResults
    ? `\nWeb Search Results:\n\n${formattedSearchResults}\n\nAnswer the user using only the above search results.\n`
    : "";

  const messages = [
    new SystemMessage(`
${systemPromptText}

${memoryContextText}

${searchContext}

If searchContext exists:
- Use search results to answer.
- Do not mention internal tools.

Rules:
- For simple questions, greetings, and short queries, respond naturally in plain text.
- For technical, educational, coding, or detailed topics, use clean Markdown.

Formatting:
- Use # for titles and ## for sections.
- Leave a blank line after headings.
- Use bullet points for lists.
- Use numbered lists for steps.
- Use fenced code blocks with language tags for code.
- Keep paragraphs short and readable.
- Never write headings and content on the same line.
- Never generate large walls of text.
`)
  ];

  // Prevent duplicating prompt
  const historyExceptCurrent = (
    history.length > 0 &&
    history[history.length - 1].role === "user" &&
    history[history.length - 1].content === state.prompt
  ) ? history.slice(0, -1) : history;

  historyExceptCurrent.forEach((msg) => {
    if (msg.role === "user") {
      messages.push(new HumanMessage(msg.content));
    } else if (msg.role === "assistant") {
      messages.push(new AIMessage(msg.content));
    }
  });

  messages.push(new HumanMessage(state.prompt));

  const response = await llm.invoke(messages);
  const images = state.searchResults?.images || [];

  // Extract new user memories in background asynchronously
  if (state.userId) {
    extractAndStoreUserMemories(state.userId, state.prompt, response.content).catch(err =>
      console.error("Async Memory Extraction Error:", err.message)
    );
  }

  return {
    ...state,
    response: response.content,
    images: images
  };
};