require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/database");

/**
 * Server Entry Point
 *
 * Boot sequence:
 *  1. Load environment variables from .env
 *  2. Connect to MongoDB Atlas
 *  3. Start Express server
 *
 * The server won't start listening until the DB connection is established,
 * ensuring we never accept requests without a working database.
 */

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  // Connect to MongoDB first
  await connectDB();

  // Start listening
  app.listen(PORT, () => {
    console.log(`\n🚀 syringe-intern-backend running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/`);
    console.log(`   API base:     http://localhost:${PORT}/api`);
    console.log(`   Webhook URL:  ${process.env.WEBHOOK_BASE_URL || "(not configured)"}/api/webhooks/qstash\n`);
  });
};

startServer().catch((error) => {
  console.error("💥 Failed to start server:", error);
  process.exit(1);
});
