import mongoose from "mongoose";
import { env } from "./env.js";

// Every service connects to the same MongoDB (shared-DB microservices,
// not DB-per-service). Each service only ever imports the models it owns
// by domain, so collection ownership stays clean even though the
// connection is shared - see backend/README.md for the DB-per-service
// upgrade path.

// Summarizes a mongodb(+srv):// URI as "db @ host" for the startup log,
// without ever touching the credentials - startup logs are the kind of
// thing that ends up pasted into a chat, a screenshot, or a CI log, and a
// real Atlas password shouldn't be one copy-paste away from a mistake.
function describeConnection(uri) {
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\//, "") || "(default)";
    return `${dbName} @ ${parsed.hostname}`;
  } catch {
    return "(unparsable connection string)";
  }
}

export async function connectDB(serviceName) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  console.log(
    `[${serviceName}] Database connected successfully — ${describeConnection(env.mongoUri)}`,
  );
}
