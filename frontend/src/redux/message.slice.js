import { createSlice } from '@reduxjs/toolkit'

const initialState = {
   messages: [],
   isLoading: false,
   artifacts: [],
   streamingStatus: null // { agent: string, label: string }
}

export const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    updateLastAssistantMessage: (state, action) => {
      const lastIndex = state.messages.length - 1;
      if (lastIndex >= 0 && state.messages[lastIndex].role === "assistant") {
        state.messages[lastIndex] = {
          ...state.messages[lastIndex],
          ...action.payload
        };
      }
    },
    appendStreamingToken: (state, action) => {
      const lastIndex = state.messages.length - 1;
      if (lastIndex >= 0 && state.messages[lastIndex].role === "assistant") {
        state.messages[lastIndex].content = (state.messages[lastIndex].content || "") + action.payload;
      }
    },
    setIsLoading: (state, action) => {
      state.isLoading = action.payload;
      if (!action.payload) {
        state.streamingStatus = null;
      }
    },
    setStreamingStatus: (state, action) => {
      state.streamingStatus = action.payload;
    },
    setArtifacts: (state, action) => {
      state.artifacts = action.payload;
    },
    updateArtifactFiles: (state, action) => {
      const { id, files } = action.payload;
      if (Array.isArray(state.artifacts)) {
        state.artifacts = state.artifacts.map((art) => {
          if (!id || art.id === id) {
            return { ...art, files };
          }
          return art;
        });
      }
      if (Array.isArray(state.messages)) {
        state.messages = state.messages.map((msg) => {
          if (Array.isArray(msg.artifacts)) {
            const updatedArts = msg.artifacts.map((art) => {
              if (!id || art.id === id) {
                return { ...art, files };
              }
              return art;
            });
            return { ...msg, artifacts: updatedArts };
          }
          return msg;
        });
      }
    }
  }
})

export const {
  setMessages,
  addMessage,
  updateLastAssistantMessage,
  appendStreamingToken,
  setIsLoading,
  setStreamingStatus,
  setArtifacts,
  updateArtifactFiles
} = messageSlice.actions

export default messageSlice.reducer