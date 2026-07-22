import { checkAgentLimit } from "../config/agentRateLimit.js";
import { deductCredits } from "../utils/deductCredits.js";
import { getModel } from "../utils/model.js";
import { extractAndStoreUserMemories } from "../utils/userMemory.engine.js";
import { extractSchemaComponents, buildDatabaseArtifact } from "../utils/schemaBuilder.js";

export const databaseAgent = async (state) => {
  await checkAgentLimit(state.userId, "database");
  await deductCredits(state.userId, "database");

  const llm = getModel("database");
  const memoryContextText = state.memoryContext || "";

  const systemPrompt = `You are CortexAI Database Schema Designer & Migration Agent.
${memoryContextText}

Your task is to design production-grade relational and document database schemas, generate Prisma ORM models, create Mermaid ERD diagrams, and write DDL migration scripts for PostgreSQL, MySQL, and MongoDB (Mongoose).

User Prompt:
${state.prompt}

=========================
OUTPUT FORMAT REQUIREMENTS
=========================
You MUST structure your response into EXACTLY the following 6 sections separated by section headers:

=== PRISMA_SCHEMA ===
// Provide complete, valid Prisma ORM schema definition
// Include @id, @unique, @relation, @default(now()), @updatedAt, and index attributes where appropriate.

=== MERMAID_ERD ===
erDiagram
    %% Provide syntax-valid Mermaid ERD diagram starting with erDiagram
    %% Define entity relationships (e.g. USER ||--o{ ORDER : places)
    %% List entity fields and attributes with proper types (e.g. string email PK)

=== POSTGRES_MIGRATION ===
-- Provide PostgreSQL SQL DDL migration script
-- CREATE TABLE, ALTER TABLE, CREATE INDEX, foreign key constraints, etc.

=== MYSQL_MIGRATION ===
-- Provide MySQL SQL DDL migration script
-- CREATE TABLE, FOREIGN KEY, ENGINE=InnoDB, utf8mb4 collation, etc.

=== MONGO_MIGRATION ===
// Provide MongoDB Mongoose Schema & migration script in JavaScript
// Define Mongoose schemas with types, required, unique, indexes, and timestamps.

=== EXPLANATION ===
Provide a clear, professional architectural explanation of:
1. Schema design decisions and normalization choices.
2. Indexing strategies for high-frequency queries.
3. Relationship cardinality (One-to-One, One-to-Many, Many-to-Many).
4. Migration safety notes (zero-downtime, breaking vs non-breaking changes).
`;

  const response = await llm.invoke(systemPrompt);
  const rawContent = response.content?.trim() || "";

  const {
    prismaSchema,
    mermaidErd,
    postgresMigration,
    mysqlMigration,
    mongoMigration,
    explanation
  } = extractSchemaComponents(rawContent);

  // Detect target dialect from prompt keywords
  const promptLower = state.prompt.toLowerCase();
  let targetDialect = "postgresql";
  if (promptLower.includes("mongo")) {
    targetDialect = "mongodb";
  } else if (promptLower.includes("mysql") || promptLower.includes("mariadb")) {
    targetDialect = "mysql";
  }

  const title = `Database Schema - ${state.prompt.slice(0, 40)}${state.prompt.length > 40 ? "..." : ""}`;

  const artifact = buildDatabaseArtifact({
    title,
    prismaSchema,
    mermaidErd,
    postgresMigration,
    mysqlMigration,
    mongoMigration,
    dialect: targetDialect
  });

  if (state.userId) {
    extractAndStoreUserMemories(state.userId, state.prompt, rawContent).catch(err =>
      console.error("Async Memory Extraction Error in databaseAgent:", err.message)
    );
  }

  const finalResponse = explanation || "Database schema design, Prisma ORM models, ERD diagram, and migration scripts generated successfully.";

  return {
    ...state,
    response: finalResponse,
    artifacts: [artifact]
  };
};
