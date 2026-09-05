import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/fa-aggregator";

async function fixCampaignTypes() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const collection = mongoose.connection.collection("businessrequirements");
    
    // Find documents that have campaignGoal or rewardType or category set, but type !== "campaign"
    const result = await collection.updateMany(
      {
        $or: [
          { campaignGoal: { $exists: true, $ne: "" } },
          { rewardType: { $exists: true, $ne: "" } }
        ],
        type: { $ne: "campaign" }
      },
      {
        $set: { type: "campaign" }
      }
    );

    console.log(`Updated ${result.modifiedCount} business requirements to type: "campaign"`);
    await mongoose.disconnect();
  } catch (err) {
    console.error("Error updating campaign types:", err);
    process.exit(1);
  }
}

fixCampaignTypes();
