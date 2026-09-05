import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/fa-aggregator";

async function checkStores() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const reqs = await mongoose.connection.collection("businessrequirements").find({}).toArray();
    console.log(`Total Business Requirements: ${reqs.length}`);
    reqs.forEach((r) => {
      console.log({
        id: r._id.toString(),
        companyName: r.companyName,
        storeUsername: r.storeUsername,
        advisorId: r.advisorId ? r.advisorId.toString() : "MISSING",
        type: r.type,
        status: r.status,
      });
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkStores();
