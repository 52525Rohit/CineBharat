import express from "express";
import helmet from "helmet";
import cors from "cors";
import axios from "axios";
import { createProxyMiddleware } from "http-proxy-middleware";
import { env } from "shared/config/env.js";


const app = express();
app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));

function proxyTo(target, targetPrefix) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => `${targetPrefix}${path}`,
  });
}

app.use("/api/admin/users", proxyTo(env.authServiceUrl, "/admin/users"));
app.use(
  "/api/admin/analytics",
  proxyTo(env.authServiceUrl, "/admin/analytics"),
);
app.use("/api/admin", proxyTo(env.catalogServiceUrl, "/admin"));

app.use("/api/auth", proxyTo(env.authServiceUrl, "/auth"));
app.use("/api/profiles", proxyTo(env.authServiceUrl, "/profiles"));

app.use("/api/upload", proxyTo(env.catalogServiceUrl, "/upload"));

app.use("/api/movies", proxyTo(env.catalogServiceUrl, "/movies"));
app.use("/api/shows", proxyTo(env.catalogServiceUrl, "/shows"));
app.use("/api/episodes", proxyTo(env.catalogServiceUrl, "/episodes"));
app.use("/api/search", proxyTo(env.catalogServiceUrl, "/search"));
app.use("/api/genres", proxyTo(env.catalogServiceUrl, "/genres"));
app.use("/uploads", proxyTo(env.catalogServiceUrl, "/uploads"));

app.use("/api/watchlist", proxyTo(env.engagementServiceUrl, "/watchlist"));
app.use(
  "/api/watch-progress",
  proxyTo(env.engagementServiceUrl, "/watch-progress"),
);
app.use(
  "/api/continue-watching",
  proxyTo(env.engagementServiceUrl, "/continue-watching"),
);
app.use(
  "/api/watch-history",
  proxyTo(env.engagementServiceUrl, "/watch-history"),
);
app.use("/api/ratings", proxyTo(env.engagementServiceUrl, "/ratings"));
app.use(
  "/api/recommendations",
  proxyTo(env.engagementServiceUrl, "/recommendations"),
);

app.use(
  "/api/subscriptions",
  proxyTo(env.subscriptionServiceUrl, "/subscriptions"),
);

// Aggregate health check - pings every downstream service so "is the
// system up" is one request instead of five.
app.get("/api/health", async (req, res) => {
  const services = {
    auth: env.authServiceUrl,
    catalog: env.catalogServiceUrl,
    engagement: env.engagementServiceUrl,
    subscription: env.subscriptionServiceUrl,
  };
  const results = await Promise.all(
    Object.entries(services).map(async ([name, url]) => {
      try {
        await axios.get(`${url}/health`, { timeout: 2000 });
        return [name, "ok"];
      } catch {
        return [name, "unreachable"];
      }
    }),
  );
  const status = Object.fromEntries(results);
  const allOk = Object.values(status).every((s) => s === "ok");
  res.status(allOk ? 200 : 503).json({ gateway: "ok", services: status });
});

app.listen(env.gatewayPort, () => {
  console.log(`[gateway] listening on http://localhost:${env.gatewayPort}`);
  console.log(
    '[gateway] reverse proxy only - no direct database connection. Look for "Database connected successfully" in the auth/catalog/engagement/subscription logs instead.',
  );
  checkDownstreamServices();
});

// started."
async function checkDownstreamServices() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const services = {
    "auth-service": env.authServiceUrl,
    "catalog-service": env.catalogServiceUrl,
    "engagement-service": env.engagementServiceUrl,
    "subscription-service": env.subscriptionServiceUrl,
  };
  const unreachable = [];
  for (const [name, url] of Object.entries(services)) {
    try {
      await axios.get(`${url}/health`, { timeout: 2000 });
    } catch {
      unreachable.push(name);
    }
  }
  if (unreachable.length > 0) {
    console.warn(`[gateway] ⚠ can't reach: ${unreachable.join(", ")}`);
    console.warn(
      '[gateway] ⚠ if you started only the gateway, stop this and run "npm start" (or "npm run dev") from the PROJECT ROOT instead - that starts all 5 services together.',
    );
  } else {
    console.log("[gateway] all downstream services reachable ✓");
  }
}
