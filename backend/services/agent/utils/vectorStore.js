import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings } from "./embedding.js";

export const createVectorStore = async (collectionName, docs) => {
  return await QdrantVectorStore.fromDocuments(
    docs,
    embeddings,
    {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName
    }
  );
};

export const getVectorStore = (collectionName) => {
  return new QdrantVectorStore(embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName
  });
};

export const addDocumentsToVectorStore = async (collectionName, docs) => {
  try {
    const store = getVectorStore(collectionName);
    await store.addDocuments(docs);
    return store;
  } catch (err) {
    // If collection does not exist yet, create it
    return await createVectorStore(collectionName, docs);
  }
};