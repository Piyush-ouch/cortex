import redis from "../../shared/redis/redis.js";


export const protect = async (req, res, next) => {
  try {
    const sessionId = req?.cookies?.session;

    if (!sessionId) {
      // Dev / Guest Fallback Session
      req.user = {
        userId: "demo-user-123",
        email: "demo@cortex.ai",
        name: "Guest Developer",
        plan: "free",
        credits: 999
      };
      return next();
    }

    const session = await redis.get(`session:${sessionId}`);

    if (!session) {
      req.user = {
        userId: "demo-user-123",
        email: "demo@cortex.ai",
        name: "Guest Developer",
        plan: "free",
        credits: 999
      };
      return next();
    }

    req.user = JSON.parse(session);
    next();
  } catch (error) {
    req.user = {
      userId: "demo-user-123",
      email: "demo@cortex.ai",
      name: "Guest Developer"
    };
    next();
  }
};