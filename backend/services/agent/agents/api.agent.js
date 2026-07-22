import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getModel } from "../utils/model.js";
import { extractAndStoreUserMemories } from "../utils/userMemory.engine.js";
import { extractApiComponents, buildApiArtifact } from "../utils/apiBuilder.js";

export const apiAgent = async (state) => {
  await checkAgentLimit(state.userId, "api_designer");
  await deductCredits(state.userId, "api_designer");

  const llm = getModel("api_designer");
  const memoryContextText = state.memoryContext || "";

  const systemPrompt = `You are CortexAI REST API Designer & Interactive Mock Studio Agent.
${memoryContextText}

Your task is to design production-grade REST APIs, generate valid OpenAPI 3.0 YAML specifications, craft Postman v2.1 Collections, generate multi-language Client SDK snippets (cURL, TypeScript, Python, Go, Rust), and construct interactive mock endpoint definitions.

User Request:
${state.prompt}

=========================
OUTPUT FORMAT REQUIREMENTS
=========================
You MUST structure your output into EXACTLY these 5 sections separated by header markers:

=== OPENAPI_YAML ===
# Provide complete, valid OpenAPI 3.0 YAML specification
# Include info, servers, paths (GET, POST, PUT, DELETE), parameters, requestBody, and components/schemas.

=== POSTMAN_COLLECTION ===
{
  "info": {
    "name": "Generated API Collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    // Include valid Postman collection item objects for each endpoint with sample requests
  ]
}

=== CLIENT_SDKS ===
{
  "curl": "curl -X GET 'https://api.example.com/v1/resource' -H 'Authorization: Bearer KEY'",
  "typescript": "// TypeScript Axios / Fetch client code...",
  "python": "# Python Requests client code...",
  "go": "// Go net/http client code...",
  "rust": "// Rust reqwest client code..."
}

=== MOCK_ENDPOINTS ===
[
  {
    "id": "ep-1",
    "method": "GET",
    "path": "/api/v1/resource",
    "summary": "Retrieve resources",
    "status": 200,
    "headers": { "Content-Type": "application/json" },
    "responseBody": [ { "id": "1", "name": "Sample Data" } ]
  },
  {
    "id": "ep-2",
    "method": "POST",
    "path": "/api/v1/resource",
    "summary": "Create resource",
    "status": 201,
    "headers": { "Content-Type": "application/json" },
    "sampleRequestBody": { "name": "New Resource" },
    "responseBody": { "id": "2", "name": "New Resource", "createdAt": "2026-07-22T20:00:00Z" }
  }
]

=== EXPLANATION ===
Provide a clear architectural explanation of:
1. RESTful design patterns, resource naming, and HTTP status code strategies.
2. Authentication & Authorization recommendations (Bearer JWT, OAuth2, API Keys).
3. Pagination, filtering, and rate limiting guidelines.
4. Error payload contracts (RFC 7807 Problem Details).
`;

  const response = await llm.invoke(systemPrompt);
  const rawContent = response.content?.trim() || "";

  const {
    openapiYaml,
    postmanCollection,
    clientSdks,
    mockEndpoints,
    explanation
  } = extractApiComponents(rawContent);

  const title = `API Spec & Mock Studio - ${state.prompt.slice(0, 40)}${state.prompt.length > 40 ? "..." : ""}`;

  const artifact = buildApiArtifact({
    title,
    openapiYaml,
    postmanCollection,
    clientSdks,
    mockEndpoints
  });

  if (state.userId) {
    extractAndStoreUserMemories(state.userId, state.prompt, rawContent).catch(err =>
      console.error("Async Memory Extraction Error in apiAgent:", err.message)
    );
  }

  const finalResponse = explanation || "API specification, Postman collection, client SDKs, and mock endpoints generated successfully.";

  return {
    ...state,
    response: finalResponse,
    artifacts: [artifact]
  };
};
