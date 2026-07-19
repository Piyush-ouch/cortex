import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getMemory } from "../utils/memory.js";
import { getModel } from "../utils/model.js";
import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";

export const chatAgent = async (state) => {
  await checkAgentLimit(state.userId, "chat");
  await deductCredits(state.userId, "chat");

  const llm = getModel("chat");
  const history = await getMemory(state.conversationId);

  const searchContext = state.searchResults
    ? `\nWeb Search Results:\n\n${state.searchResults}\n\nAnswer the user using only the above search results.\n`
    : "";

  const messages = [
    new SystemMessage(`
You are CortexAI, an intelligent AI assistant.

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

  // Prevent duplicating prompt: if memory history already ends with the current user prompt, exclude it from history iteration
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

  // Append current prompt exactly once
  messages.push(new HumanMessage(state.prompt));

  const response = await llm.invoke(messages);
  const images = state.searchResults?.images || [];

  return {
    ...state,
    response: response.content,
    images: images
  };
};