const express = require("express");
const cors = require("cors");
const jobRoutes = require("./routes/jobRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

/**
 * Express App Configuration
 *
 * Middleware order matters:
 *  1. CORS — allows the React frontend (different port) to call our API.
 *  2. JSON parser — but ONLY for non-webhook routes.
 *     Webhook routes use express.raw() at the route level (see webhookRoutes.js)
 *     because QStash signature verification needs the raw body.
 *  3. Routes are mounted under /api/ namespace.
 *  4. Health check at root for quick verification.
 */

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// Parse JSON bodies for all routes EXCEPT webhooks
// Webhook routes handle their own body parsing (express.raw)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/webhooks")) {
    // Skip JSON parsing for webhook routes — they need the raw body
    return next();
  }
  express.json()(req, res, next);
});

// Routes
app.use("/api/jobs", jobRoutes);
app.use("/api/webhooks", webhookRoutes);

// Health Check
app.get("/", (req, res) => {
  res.json({
    status: "healthy",
    service: "syringe-intern-backend",
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
