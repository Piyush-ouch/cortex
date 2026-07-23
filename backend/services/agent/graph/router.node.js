import { getModel } from "../utils/model.js";
import { getRelevantUserMemories, buildMemoryContextPrompt } from "../utils/userMemory.engine.js";

export const routerNode = async (state) => {
  let memoryContext = "";
  if (state.userId && state.prompt) {
    try {
      const memories = await getRelevantUserMemories(state.userId, state.prompt, 5);
      memoryContext = buildMemoryContextPrompt(memories);
    } catch (memErr) {
      console.warn("Memory retrieval error in routerNode:", memErr.message);
    }
  }

  if (state.agent && state.agent !== "auto") {
    return {
      ...state,
      agent: state.agent,
      memoryContext
    };
  }

  if (state.file) {
    if (state.file.mimetype.startsWith("image/")) {
      return {
        ...state,
        agent: "vision",
        memoryContext
      };
    }
    if (state.file.mimetype === "application/pdf") {
      return {
        ...state,
        agent: "pdf_rag",
        memoryContext
      };
    }
  }


 const llm =
 getModel("router");

 const result =
 await llm.invoke(`

You are an agent router.

Available agents:

- chat
- search
- coding
- database
- api_designer
- security_auditor
- pdf
- ppt
- image 

Rules:

chat:
General conversation,
explanations,
learning,
questions.

search:
Current events,
latest information,
news,
recent developments,
internet lookup.

coding:
Generate code,
debug code,
build projects,
architecture.

database:
Database schema design,
Prisma ORM models,
ERD diagrams,
SQL migrations,
PostgreSQL, MySQL, MongoDB schemas.

api_designer:
REST API design,
OpenAPI specifications,
Swagger JSON/YAML,
Postman collections,
Mock API endpoints,
HTTP client SDKs.

security_auditor:
Security code audit,
Vulnerability scanning,
OWASP Top 10 evaluation,
Secret leak detection,
SQL injection & XSS detection,
Security advisory & automated remediation patches.

pdf:
Questions about generate PDFs
or document context.

ppt:
Questions about generate ppts
or ppt context.

Return ONLY one word:

chat
search
coding
database
api_designer
security_auditor
pdf
ppt
image

User Query:

${state.prompt}

 `);

 return {
  ...state,
  memoryContext,
  agent:
  result.content
   .trim()
   .toLowerCase()
 };
};