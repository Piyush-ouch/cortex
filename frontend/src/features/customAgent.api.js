import api from "../utils/axios";

export const getCustomAgents = async () => {
  const { data } = await api.get("/api/agent/custom-agents");
  return data;
};

export const createCustomAgent = async (payload) => {
  const { data } = await api.post("/api/agent/custom-agents", payload);
  return data;
};

export const deleteCustomAgent = async (id) => {
  const { data } = await api.delete(`/api/agent/custom-agents/${id}`);
  return data;
};
