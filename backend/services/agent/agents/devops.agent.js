import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getModel } from "../utils/model.js";
import { extractAndStoreUserMemories } from "../utils/userMemory.engine.js";
import { extractDevOpsComponents, buildDevOpsArtifact } from "../utils/devopsBuilder.js";

export const devopsAgent = async (state) => {
  await checkAgentLimit(state.userId, "devops_agent");
  await deductCredits(state.userId, "devops_agent");

  const llm = getModel("devops_agent");
  const memoryContextText = state.memoryContext || "";

  const systemPrompt = `You are Cortex DevOps Bot — Autonomous CI/CD Pipeline & Pull Request Simulator Agent.
${memoryContextText}

Your task is to take a GitHub Repository URL, issue ticket, or feature request from the user, simulate an autonomous CI/CD workflow, generate multi-file codebase patches with Git diffs, simulate execution of unit test suites (Jest/Vitest/PyTest), auto-heal any broken test assertions, and construct a production-ready GitHub Pull Request.

User Request / Issue Ticket:
${state.prompt}

=========================
OUTPUT FORMAT REQUIREMENTS
=========================
You MUST structure your response into EXACTLY these 4 sections separated by header markers:

=== DEVOPS_CONFIG ===
{
  "repoUrl": "https://github.com/cortex-ai/workspace-app",
  "branchName": "feat/auto-patch-issue-104",
  "targetBranch": "main",
  "issueTicket": "#104",
  "testFramework": "Jest / Vitest",
  "status": "PASSED" // "PASSED" | "FAILED" | "AUTO_HEALED"
}

=== SIMULATED_WORKTREE ===
[
  {
    "path": "backend/src/controllers/user.controller.js",
    "status": "MODIFIED", // "MODIFIED" | "ADDED" | "DELETED"
    "diff": "@@ -10,4 +10,7 @@ export const getUser = async (req, res) => {\n+ if (!req.params.id) return res.status(400).json({ error: 'ID required' });\n",
    "content": "// Full updated file content..."
  }
]

=== TEST_SUITE_RESULTS ===
{
  "totalTests": 14,
  "passed": 14,
  "failed": 0,
  "durationMs": 1420,
  "testOutput": "PASS src/__tests__/auth.test.js\nPASS src/__tests__/api.test.js\n\nTest Suites: 2 passed, 2 total\nTests:       14 passed, 14 total"
}

=== PULL_REQUEST ===
{
  "title": "feat: resolve rate limiting & parameter validation issue #104",
  "prNumber": 42,
  "branch": "feat/auto-patch-issue-104",
  "author": "Cortex DevOps Bot",
  "summary": "Detailed technical summary of code changes applied.",
  "changesSummary": "- Added rate limiting middleware\n- Added unit tests verifying negative error states\n- Sanitized request inputs",
  "regressionReport": "0 regressions detected. Test suite passed in 1.42s.",
  "previewDeployUrl": "https://preview-pr-42.cortex.dev"
}
`;

  const response = await llm.invoke(systemPrompt);
  const rawContent = response.content?.trim() || "";

  const {
    config,
    worktree,
    testResults,
    pullRequest
  } = extractDevOpsComponents(rawContent);

  const title = `DevOps PR Simulator - ${state.prompt.slice(0, 35)}${state.prompt.length > 35 ? "..." : ""}`;

  const artifact = buildDevOpsArtifact({
    title,
    config,
    worktree,
    testResults,
    pullRequest
  });

  if (state.userId) {
    extractAndStoreUserMemories(state.userId, state.prompt, rawContent).catch(err =>
      console.error("Async Memory Extraction Error in devopsAgent:", err.message)
    );
  }

  const finalResponse = pullRequest.summary || `Autonomous DevOps workflow complete. Pull Request #${pullRequest.prNumber || 42} compiled successfully with ${worktree.length} modified files and passing test suite.`;

  return {
    ...state,
    response: finalResponse,
    artifacts: [artifact]
  };
};
