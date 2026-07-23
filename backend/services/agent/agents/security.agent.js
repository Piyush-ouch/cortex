import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getModel } from "../utils/model.js";
import { extractAndStoreUserMemories } from "../utils/userMemory.engine.js";
import { extractSecurityComponents, buildSecurityArtifact } from "../utils/securityAuditor.js";

export const securityAgent = async (state) => {
  await checkAgentLimit(state.userId, "security_auditor");
  await deductCredits(state.userId, "security_auditor");

  const llm = getModel("security_auditor");
  const memoryContextText = state.memoryContext || "";

  const systemPrompt = `You are Cortex Sentinel — Enterprise AI Security Auditor & Vulnerability Remediation Agent.
${memoryContextText}

Your task is to conduct rigorous, automated security audits on source code, API handlers, database queries, and architectural designs provided by the user. You evaluate code against OWASP Top 10 vulnerabilities (Injection, Broken Auth, Sensitive Data Exposure, XML/JSON Deserialization, Broken Access Control, Security Misconfigurations, XSS, Insecure Deserialization, Secret Leaks, CSRF/SSRF).

User Request & Target Code to Audit:
${state.prompt}

=========================
OUTPUT FORMAT REQUIREMENTS
=========================
You MUST structure your response into EXACTLY these 5 sections separated by header markers:

=== SECURITY_METRICS ===
{
  "score": 45, // Security Score from 0 (Extremely Vulnerable) to 100 (Bulletproof)
  "riskLevel": "CRITICAL", // "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SECURE"
  "summary": "High-level diagnostic summary explaining the overall security posture and primary threat vectors detected."
}

=== VULNERABILITIES ===
[
  {
    "id": "VULN-001",
    "title": "SQL Injection in User Lookup Handler",
    "severity": "CRITICAL", // "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    "cwe": "CWE-89",
    "category": "OWASP A03:2021 - Injection",
    "location": "Line 12 (or file segment)",
    "description": "Clear explanation of why this code pattern is unsafe and how it breaches security boundaries.",
    "attackScenario": "Realistic step-by-step exploit demonstration showing how an attacker could leverage this weakness.",
    "patchCode": "// Snippet of the exact fixed lines of code\nconst user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);"
  }
]

=== COMPLIANCE ===
{
  "owasp": "FAIL", // "PASS" | "FAIL"
  "secrets": "CLEAN", // "CLEAN" | "LEAKED"
  "auth": "VULNERABLE", // "SECURE" | "VULNERABLE"
  "gdpr": "RISK" // "COMPLIANT" | "RISK" | "N/A"
}

=== REMEDIATED_CODE ===
// Provide complete, battle-tested, fully secure, production-grade replacement code incorporating all security fixes, input sanitization, rate limiting, and parameterization.

=== ADVISORY ===
Provide a comprehensive security advisory document covering:
1. Executive Summary & Audit Methodology.
2. Threat Modeling & Attack Surface Analysis.
3. Vulnerability Breakdown & Remediation Action Items.
4. Security Best Practices & Hardening Recommendations (CORS, CSP, TLS, Secrets Management).
`;

  const response = await llm.invoke(systemPrompt);
  const rawContent = response.content?.trim() || "";

  const {
    score,
    riskLevel,
    summary,
    vulnerabilities,
    compliance,
    remediatedCode,
    advisory
  } = extractSecurityComponents(rawContent);

  const title = `Security Audit Report - ${state.prompt.slice(0, 35)}${state.prompt.length > 35 ? "..." : ""}`;

  const artifact = buildSecurityArtifact({
    title,
    score,
    riskLevel,
    summary,
    vulnerabilities,
    compliance,
    remediatedCode,
    advisory
  });

  if (state.userId) {
    extractAndStoreUserMemories(state.userId, state.prompt, rawContent).catch(err =>
      console.error("Async Memory Extraction Error in securityAgent:", err.message)
    );
  }

  const finalResponse = advisory || `Security audit complete. Identified ${vulnerabilities.length} security items with an overall security score of ${score}/100 (${riskLevel} risk).`;

  return {
    ...state,
    response: finalResponse,
    artifacts: [artifact]
  };
};
