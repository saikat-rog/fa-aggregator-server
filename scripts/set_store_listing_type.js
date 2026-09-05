import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/fa-aggregator";

async function setStore() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const collection = mongoose.connection.collection("businessrequirements");
    
    // Update the store application (@fromindia) to type: "store" and status: "approved"
    const result = await collection.updateOne(
      { storeUsername: "fromindia" },
      { $set: { type: "store", status: "approved", approvedAt: new Date() } }
    );

    console.log(`Updated store application @fromindia:`, result);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

setStore();
