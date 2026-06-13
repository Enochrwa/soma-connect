import http from "http";
import { app } from "./app.js";
import { connectDB } from "./db.js";
import { env } from "./config/env.js";
import { initSocket } from "./socket/index.js";
import { initAutomations } from "./services/automation.service.js";

async function main() {
  await connectDB();
  const server = http.createServer(app);
  initSocket(server);
  initAutomations();
  server.listen(env.PORT, () => {
    console.log(`[server] http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
