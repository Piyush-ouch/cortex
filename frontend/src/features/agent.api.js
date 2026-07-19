import api from "../utils/axios";

export const sendPrompt = async (payload) => {
  const { data } = await api.post("/api/agent/chat", payload);
  return data;
};

export const sendPromptStream = async (formData, { onStatus, onToken, onDone, onError }) => {
  try {
    const response = await fetch("http://localhost:5000/api/agent/chat", {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: {
        Accept: "text/event-stream"
      }
    });

    if (!response.ok) {
      let errMessage = "Request failed with status " + response.status;
      try {
        const errorJson = await response.json();
        errMessage = errorJson.message || errMessage;
      } catch (e) {}
      const error = new Error(errMessage);
      error.status = response.status;
      throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        if (!block.trim()) continue;

        let eventType = "message";
        let eventDataRaw = "";

        const lines = block.split("\n");
        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.replace("event:", "").trim();
          } else if (line.startsWith("data:")) {
            eventDataRaw += line.replace("data:", "").trim();
          }
        }

        if (eventDataRaw) {
          try {
            const parsedData = JSON.parse(eventDataRaw);
            if (eventType === "status") {
              onStatus?.(parsedData);
            } else if (eventType === "token") {
              onToken?.(parsedData.content);
            } else if (eventType === "done") {
              onDone?.(parsedData);
            } else if (eventType === "error") {
              onError?.(parsedData);
            }
          } catch (err) {
            console.error("SSE parse error:", err, eventDataRaw);
          }
        }
      }
    }
  } catch (error) {
    onError?.({ message: error.message });
    throw error;
  }
};