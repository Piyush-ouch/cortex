import api from "../utils/axios";

export const uploadKBDocument = async (formData) => {
  const { data } = await api.post("/api/agent/kb/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return data;
};

export const getKBDocuments = async () => {
  const { data } = await api.get("/api/agent/kb");
  return data;
};

export const deleteKBDocument = async (id) => {
  const { data } = await api.delete(`/api/agent/kb/${id}`);
  return data;
};
