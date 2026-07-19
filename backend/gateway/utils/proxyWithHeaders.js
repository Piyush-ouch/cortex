import proxy from "express-http-proxy";

export const proxyWithUser = (serviceUrl) => {
  return proxy(serviceUrl, {
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (srcReq.user) {
        proxyReqOpts.headers["x-user-id"] = String(srcReq.user.userId || "");
        proxyReqOpts.headers["x-user-email"] = String(srcReq.user.email || "");
        proxyReqOpts.headers["x-user-avatar"] = String(srcReq.user.avatar || "");
      }
      return proxyReqOpts;
    }
  });
};