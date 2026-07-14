# Cortex AI — Backend Microservices

This directory contains the microservices architecture that powers Cortex AI.

For full setup guides, system architecture diagrams, environment configurations, and details on how to contribute or add new specialized LangGraph agents, please see the **[Root README](../README.md)**.

## Directory Layout

*   `gateway/`: Express-based entry proxy and rate limiter.
*   `shared/`: Code and connection utilities shared across microservices.
*   `services/`:
    *   `agent/`: LangGraph orchestrator containing agent definitions (chat, code, search, PDF/PPT, vision, RAG).
    *   `auth/`: Token and account security with Firebase and MongoDB.
    *   `chat/`: State management for client discussions.
    *   `billing/`: Razorpay payment hooks.
