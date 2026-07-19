import api from "../utils/axios";

export const getAnalytics = async () => {
  const { data } = await api.get("/api/billing/analytics");
  return data;
};
