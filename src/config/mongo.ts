import mongoose from "mongoose";
import { env } from "./env";

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGO_URI, {
    autoIndex: env.NODE_ENV !== "production",
    serverSelectionTimeoutMS: 15000,
  });
  mongoose.connection.on("error", (err) => {
    console.error("🔴 Mongo error:", err);
  });
  console.log("🟢 Mongo connected");
}
