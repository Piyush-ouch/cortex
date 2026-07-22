/**
 * Utility functions for API Designer & Interactive Mock Studio Agent
 * Provides parsing, sanitization, validation, and artifact building for OpenAPI 3.0 specs,
 * Postman v2.1 Collections, Client SDKs, and Mock API Endpoint definitions.
 */

export function cleanCodeBlock(text = "") {
  if (typeof text !== "string") return "";
  return text
    .replace(/^```[a-zA-Z0-9_-]*\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();
}

/**
 * Extracts OpenAPI YAML, OpenAPI JSON, Postman Collection, Client SDKs, and Endpoint Mocks.
 */
export function extractApiComponents(rawContent = "") {
  if (typeof rawContent !== "string") {
    rawContent = "";
  }

  let openapiYaml = "";
  let openapiJson = "";
  let postmanCollection = "";
  let clientSdks = {};
  let mockEndpoints = [];
  let explanation = "";

  // Extract OPENAPI YAML
  const yamlMatch = rawContent.match(/===+\s*OPENAPI_YAML\s*===+\n([\s\S]*?)(?===\s*POSTMAN_COLLECTION|===\s*CLIENT_SDKS|===\s*MOCK_ENDPOINTS|===\s*EXPLANATION|$)/i)
    || rawContent.match(/```yaml\n([\s\S]*?)```/i);
  if (yamlMatch) {
    openapiYaml = cleanCodeBlock(yamlMatch[1]);
  }

  // Extract POSTMAN COLLECTION
  const postmanMatch = rawContent.match(/===+\s*POSTMAN_COLLECTION\s*===+\n([\s\S]*?)(?===\s*CLIENT_SDKS|===\s*MOCK_ENDPOINTS|===\s*EXPLANATION|$)/i)
    || rawContent.match(/```json\s*(?:\/\/\s*Postman)?\n([\s\S]*?)```/i);
  if (postmanMatch) {
    postmanCollection = cleanCodeBlock(postmanMatch[1]);
  }

  // Extract CLIENT SDKs
  const sdksMatch = rawContent.match(/===+\s*CLIENT_SDKS\s*===+\n([\s\S]*?)(?===\s*MOCK_ENDPOINTS|===\s*EXPLANATION|$)/i);
  if (sdksMatch) {
    try {
      clientSdks = JSON.parse(cleanCodeBlock(sdksMatch[1]));
    } catch (e) {
      clientSdks = {};
    }
  }

  // Extract MOCK ENDPOINTS
  const mockMatch = rawContent.match(/===+\s*MOCK_ENDPOINTS\s*===+\n([\s\S]*?)(?===\s*EXPLANATION|$)/i);
  if (mockMatch) {
    try {
      mockEndpoints = JSON.parse(cleanCodeBlock(mockMatch[1]));
    } catch (e) {
      mockEndpoints = [];
    }
  }

  // Extract EXPLANATION
  const expMatch = rawContent.match(/===+\s*EXPLANATION\s*===+\n([\s\S]*?)$/i);
  if (expMatch) {
    explanation = expMatch[1].trim();
  } else {
    explanation = rawContent
      .replace(/===+\s*[A-Z_]+\s*===+\n[\s\S]*?(?====+|$)/g, "")
      .replace(/```[a-z]*\n[\s\S]*?```/g, "")
      .trim();
  }

  // Fallbacks if missing
  if (!openapiYaml) {
    openapiYaml = `openapi: 3.0.3
info:
  title: CortexAI Generated REST API
  description: Production-grade REST API designed by CortexAI API Agent
  version: 1.0.0
servers:
  - url: https://api.example.com/v1
    description: Production Server
paths:
  /users:
    get:
      summary: List users
      operationId: listUsers
      responses:
        '200':
          description: Successful user list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
    post:
      summary: Create a user
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created successfully
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
        name:
          type: string
    CreateUserRequest:
      type: object
      required:
        - email
      properties:
        email:
          type: string
        name:
          type: string`;
  }

  if (!postmanCollection) {
    postmanCollection = JSON.stringify({
      info: {
        name: "CortexAI Generated API Collection",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        {
          name: "List Users",
          request: {
            method: "GET",
            header: [],
            url: { raw: "https://api.example.com/v1/users", host: ["https://api.example.com"], path: ["v1", "users"] }
          }
        },
        {
          name: "Create User",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: { mode: "raw", raw: "{\n  \"email\": \"user@example.com\",\n  \"name\": \"Jane Doe\"\n}" },
            url: { raw: "https://api.example.com/v1/users", host: ["https://api.example.com"], path: ["v1", "users"] }
          }
        }
      ]
    }, null, 2);
  }

  if (!clientSdks.curl) {
    clientSdks = {
      curl: `curl -X GET "https://api.example.com/v1/users" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json"`,
      typescript: `import axios from 'axios';\n\nexport const fetchUsers = async () => {\n  const response = await axios.get('https://api.example.com/v1/users', {\n    headers: { Authorization: 'Bearer YOUR_API_KEY' }\n  });\n  return response.data;\n};`,
      python: `import requests\n\ndef fetch_users():\n    headers = {"Authorization": "Bearer YOUR_API_KEY"}\n    response = requests.get("https://api.example.com/v1/users", headers=headers)\n    return response.json()`,
      go: `package main\n\nimport (\n\t"fmt"\n\t"io/ioutil"\n\t"net/http"\n)\n\nfunc main() {\n\treq, _ := http.NewRequest("GET", "https://api.example.com/v1/users", nil)\n\treq.Header.Set("Authorization", "Bearer YOUR_API_KEY")\n\tclient := &http.Client{}\n\tresp, _ := client.Do(req)\n\tdefer resp.Body.Close()\n\tbody, _ := ioutil.ReadAll(resp.Body)\n\tfmt.Println(string(body))\n}`,
      rust: `use reqwest::header::HeaderMap;\n\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n    let client = reqwest::Client::new();\n    let res = client.get("https://api.example.com/v1/users")\n        .header("Authorization", "Bearer YOUR_API_KEY")\n        .send()\n        .await?\n        .text()\n        .await?;\n    println!("{}", res);\n    Ok(())\n}`
    };
  }

  if (!Array.isArray(mockEndpoints) || mockEndpoints.length === 0) {
    mockEndpoints = [
      {
        id: "endpoint-1",
        method: "GET",
        path: "/api/v1/users",
        summary: "List all users",
        status: 200,
        headers: { "Content-Type": "application/json" },
        responseBody: [
          { id: "usr_101", email: "alice@example.com", name: "Alice Smith", role: "admin", status: "active" },
          { id: "usr_102", email: "bob@example.com", name: "Bob Jones", role: "user", status: "active" }
        ]
      },
      {
        id: "endpoint-2",
        method: "POST",
        path: "/api/v1/users",
        summary: "Create a new user",
        status: 201,
        headers: { "Content-Type": "application/json" },
        sampleRequestBody: { email: "charlie@example.com", name: "Charlie Brown", role: "user" },
        responseBody: { id: "usr_103", email: "charlie@example.com", name: "Charlie Brown", role: "user", status: "active", createdAt: new Date().toISOString() }
      },
      {
        id: "endpoint-3",
        method: "GET",
        path: "/api/v1/users/:id",
        summary: "Get user by ID",
        status: 200,
        headers: { "Content-Type": "application/json" },
        responseBody: { id: "usr_101", email: "alice@example.com", name: "Alice Smith", role: "admin", status: "active", createdAt: "2026-01-15T10:00:00Z" }
      },
      {
        id: "endpoint-4",
        method: "DELETE",
        path: "/api/v1/users/:id",
        summary: "Delete user",
        status: 200,
        headers: { "Content-Type": "application/json" },
        responseBody: { success: true, message: "User usr_101 deleted successfully" }
      }
    ];
  }

  return {
    openapiYaml,
    openapiJson: JSON.stringify({ yaml: openapiYaml }),
    postmanCollection,
    clientSdks,
    mockEndpoints,
    explanation
  };
}

export function buildApiArtifact({
  title = "REST API Specification & Mock Studio",
  openapiYaml,
  postmanCollection,
  clientSdks,
  mockEndpoints
}) {
  const files = [
    {
      name: "openapi.yaml",
      content: openapiYaml,
      language: "yaml"
    },
    {
      name: "postman_collection.json",
      content: postmanCollection,
      language: "json"
    },
    {
      name: "client_sdks.json",
      content: typeof clientSdks === "string" ? clientSdks : JSON.stringify(clientSdks, null, 2),
      language: "json"
    },
    {
      name: "mock_endpoints.json",
      content: typeof mockEndpoints === "string" ? mockEndpoints : JSON.stringify(mockEndpoints, null, 2),
      language: "json"
    }
  ];

  return {
    id: Date.now(),
    type: "api_specification",
    title,
    openapiYaml,
    postmanCollection,
    clientSdks,
    mockEndpoints,
    files,
    createdAt: new Date().toISOString()
  };
}
