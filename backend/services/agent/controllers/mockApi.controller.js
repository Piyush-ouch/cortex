/**
 * Mock API Runner Controller
 * Executes simulated HTTP requests against generated endpoint mock definitions.
 */

export const executeMockApiRequest = async (req, res) => {
  const startTime = Date.now();

  try {
    const { path, method = "GET", headers = {}, body = null, mockEndpoints = [] } = req.body;

    if (!path) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Target path is required for mock request execution."
      });
    }

    const cleanPath = path.trim();
    const cleanMethod = method.toUpperCase().trim();

    // Find matching endpoint from mock definitions
    let matchedEndpoint = mockEndpoints.find(ep => {
      const epMethod = ep.method?.toUpperCase();
      if (epMethod !== cleanMethod) return false;

      const epPathPattern = ep.path
        ?.replace(/:[a-zA-Z0-9_]+/g, "[^/]+")
        ?.replace(/\{[a-zA-Z0-9_]+\}/g, "[^/]+");

      if (!epPathPattern) return false;

      const regex = new RegExp(`^${epPathPattern}$`, "i");
      return regex.test(cleanPath) || ep.path === cleanPath;
    });

    // Fallback match by path only if exact method didn't hit
    if (!matchedEndpoint) {
      matchedEndpoint = mockEndpoints.find(ep => ep.path === cleanPath);
    }

    // Simulate realistic network latency (60-120ms)
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 60) + 60));
    const executionTimeMs = Date.now() - startTime;

    if (!matchedEndpoint) {
      return res.status(404).json({
        status: 404,
        statusText: "Not Found",
        executionTimeMs,
        headers: { "content-type": "application/json" },
        data: {
          error: "404 Not Found",
          message: `No mock endpoint definition found matching ${cleanMethod} ${cleanPath}`
        }
      });
    }

    let responseData = matchedEndpoint.responseBody;

    // Dynamic payload echoing for POST/PUT requests
    if ((cleanMethod === "POST" || cleanMethod === "PUT") && body && typeof responseData === "object" && responseData !== null) {
      responseData = {
        ...responseData,
        ...(typeof body === "object" ? body : {}),
        updatedAt: new Date().toISOString()
      };
    }

    return res.status(200).json({
      status: matchedEndpoint.status || 200,
      statusText: matchedEndpoint.status === 201 ? "Created" : "OK",
      executionTimeMs,
      headers: matchedEndpoint.headers || { "content-type": "application/json" },
      data: responseData,
      matchedEndpoint: {
        id: matchedEndpoint.id,
        path: matchedEndpoint.path,
        method: matchedEndpoint.method
      }
    });
  } catch (error) {
    console.error("Error executing mock API request:", error);
    return res.status(500).json({
      status: 500,
      statusText: "Internal Server Error",
      executionTimeMs: Date.now() - startTime,
      headers: { "content-type": "application/json" },
      data: {
        error: "Mock Server Execution Error",
        message: error.message
      }
    });
  }
};
