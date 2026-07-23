/**
 * Utility functions for Cortex Autonomous CI/CD DevOps Agent & PR Simulator
 * Provides parsing, extraction, fallback generation, and artifact building for DevOps PR Simulations.
 */

export function cleanCodeBlock(text = "") {
  if (typeof text !== "string") return "";
  return text
    .replace(/^```[a-zA-Z0-9_-]*\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();
}

/**
 * Extracts DevOps Configuration, Worktree File Diffs, Test Suite Execution Results, and Pull Request metadata.
 */
export function extractDevOpsComponents(rawContent = "") {
  if (typeof rawContent !== "string") {
    rawContent = "";
  }

  let config = {
    repoUrl: "https://github.com/cortex-ai/workspace-app",
    branchName: "feat/devops-auto-fix",
    targetBranch: "main",
    issueTicket: "#104",
    testFramework: "Jest / Vitest",
    status: "PASSED"
  };
  let worktree = [];
  let testResults = {
    totalTests: 12,
    passed: 12,
    failed: 0,
    durationMs: 1240,
    testOutput: "PASS  src/__tests__/auth.test.js\nPASS  src/__tests__/api.test.js\n\nTest Suites: 2 passed, 2 total\nTests:       12 passed, 12 total"
  };
  let pullRequest = {
    title: "feat: implement rate limiting and sanitize authentication controllers",
    prNumber: 42,
    branch: "feat/devops-auto-fix",
    author: "Cortex DevOps Bot",
    summary: "Automated patch fixing security parameter validation and adding test suite assertions.",
    changesSummary: "- Added Express rate limiting middleware to auth router\n- Added Jest unit tests for invalid payload verification\n- Sanitized MongoDB query parameters",
    regressionReport: "0 performance regressions detected. Test suite duration: 1.24s.",
    previewDeployUrl: "https://preview-pr-42.cortex.dev"
  };

  // Extract DEVOPS_CONFIG
  const configMatch = rawContent.match(/===+\s*DEVOPS_CONFIG\s*===+\n([\s\S]*?)(?===\s*SIMULATED_WORKTREE|===\s*TEST_SUITE_RESULTS|===\s*PULL_REQUEST|$)/i);
  if (configMatch) {
    try {
      config = JSON.parse(cleanCodeBlock(configMatch[1]));
    } catch (e) {
      console.warn("Failed to parse DEVOPS_CONFIG JSON:", e.message);
    }
  }

  // Extract SIMULATED_WORKTREE
  const worktreeMatch = rawContent.match(/===+\s*SIMULATED_WORKTREE\s*===+\n([\s\S]*?)(?===\s*TEST_SUITE_RESULTS|===\s*PULL_REQUEST|$)/i);
  if (worktreeMatch) {
    try {
      worktree = JSON.parse(cleanCodeBlock(worktreeMatch[1]));
    } catch (e) {
      console.warn("Failed to parse SIMULATED_WORKTREE JSON:", e.message);
    }
  }

  // Extract TEST_SUITE_RESULTS
  const testMatch = rawContent.match(/===+\s*TEST_SUITE_RESULTS\s*===+\n([\s\S]*?)(?===\s*PULL_REQUEST|$)/i);
  if (testMatch) {
    try {
      testResults = JSON.parse(cleanCodeBlock(testMatch[1]));
    } catch (e) {
      console.warn("Failed to parse TEST_SUITE_RESULTS JSON:", e.message);
    }
  }

  // Extract PULL_REQUEST
  const prMatch = rawContent.match(/===+\s*PULL_REQUEST\s*===+\n([\s\S]*?)$/i);
  if (prMatch) {
    try {
      pullRequest = JSON.parse(cleanCodeBlock(prMatch[1]));
    } catch (e) {
      console.warn("Failed to parse PULL_REQUEST JSON:", e.message);
    }
  }

  // Fallback worktree if empty
  if (!worktree || !Array.isArray(worktree) || worktree.length === 0) {
    worktree = [
      {
        path: "backend/src/routes/auth.route.js",
        status: "MODIFIED",
        diff: `@@ -12,6 +12,9 @@ import express from "express";
+import { authLimiter } from "../middlewares/rateLimiter.js";
 import { loginHandler } from "../controllers/auth.controller.js";

 const router = express.Router();
-router.post("/login", loginHandler);
+router.post("/login", authLimiter, loginHandler);`,
        content: `import express from "express";\nimport { authLimiter } from "../middlewares/rateLimiter.js";\nimport { loginHandler } from "../controllers/auth.controller.js";\n\nconst router = express.Router();\nrouter.post("/login", authLimiter, loginHandler);\nexport default router;`
      },
      {
        path: "backend/src/middlewares/rateLimiter.js",
        status: "ADDED",
        diff: `@@ -0,0 +1,12 @@
+import rateLimit from "express-rate-limit";
+
+export const authLimiter = rateLimit({
+  windowMs: 15 * 60 * 1000,
+  max: 10,
+  message: { error: "Too many authentication requests, try again later." }
+});`,
        content: `import rateLimit from "express-rate-limit";\n\nexport const authLimiter = rateLimit({\n  windowMs: 15 * 60 * 1000,\n  max: 10,\n  message: { error: "Too many authentication requests, try again later." }\n});`
      },
      {
        path: "backend/src/__tests__/auth.test.js",
        status: "ADDED",
        diff: `@@ -0,0 +1,24 @@
+import request from "supertest";
+import app from "../app.js";
+
+describe("Auth Rate Limiter Middleware", () => {
+  it("should enforce request quota limit", async () => {
+    const res = await request(app).post("/api/auth/login").send({ email: "invalid" });
+    expect(res.status).not.toBe(500);
+  });
+});`,
        content: `import request from "supertest";\nimport app from "../app.js";\n\ndescribe("Auth Rate Limiter Middleware", () => {\n  it("should enforce request quota limit", async () => {\n    const res = await request(app).post("/api/auth/login").send({ email: "invalid" });\n    expect(res.status).not.toBe(500);\n  });\n});`
      }
    ];
  }

  return {
    config,
    worktree,
    testResults,
    pullRequest
  };
}

export function buildDevOpsArtifact({
  title = "Cortex DevOps Bot — PR & CI/CD Simulation",
  config = {},
  worktree = [],
  testResults = {},
  pullRequest = {}
}) {
  const prSummaryJson = JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      config,
      pullRequest,
      testResults,
      worktreeSummary: worktree.map(w => ({ path: w.path, status: w.status }))
    },
    null,
    2
  );

  const gitPatchDiff = worktree
    .map(w => `diff --git a/${w.path} b/${w.path}\n--- a/${w.path}\n+++ b/${w.path}\n${w.diff}`)
    .join("\n\n");

  const testLogsText = testResults.testOutput || "Test execution logs unavailable.";

  const prMarkdown = `# ${pullRequest.title || "Automated Pull Request"}

**PR Number**: #${pullRequest.prNumber || 42}  
**Branch**: \`${config.branchName || "feat/auto-patch"}\` ➔ \`${config.targetBranch || "main"}\`  
**Author**: ${pullRequest.author || "Cortex DevOps Bot"}  
**Status**: ${config.status === "PASSED" ? "✅ All Tests Passing" : "⚠️ Needs Review"}  

---

## 📝 Summary
${pullRequest.summary || "Automated code patch and test suite execution."}

## 🔍 Key Changes
${pullRequest.changesSummary || "- Applied multi-file bug fix\n- Added unit tests"}

## 🧪 CI/CD Test Suite Execution
- **Total Tests**: ${testResults.totalTests || 12}
- **Passed**: ${testResults.passed || 12}
- **Failed**: ${testResults.failed || 0}
- **Duration**: ${testResults.durationMs || 1240} ms

## 🚀 Live Preview Environment
[View Container Deployment](${pullRequest.previewDeployUrl || "https://preview-pr-42.cortex.dev"})
`;

  const files = [
    {
      name: "pr_summary.json",
      content: prSummaryJson,
      language: "json"
    },
    {
      name: "git_patch.diff",
      content: gitPatchDiff,
      language: "diff"
    },
    {
      name: "test_results.log",
      content: testLogsText,
      language: "text"
    },
    {
      name: "pull_request.md",
      content: prMarkdown,
      language: "markdown"
    }
  ];

  return {
    id: Date.now(),
    type: "devops_simulation",
    title,
    config,
    worktree,
    testResults,
    pullRequest,
    files,
    createdAt: new Date().toISOString()
  };
}
