import { buildApp } from "./app";
import { connectMongo } from "./config/mongo";
import { getRedis } from "./config/redis";
import { env } from "./config/env";

async function main() {
  await connectMongo();
  getRedis(); // init connection

  const app = buildApp();
  app.listen(env.PORT, () => {
    console.log(`🚀 API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal boot error:", err);
  process.exit(1);
});
