import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/fa-aggregator";

async function debug() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const reqs = await mongoose.connection.collection("businessrequirements").find({}).toArray();
    console.log(`--- Business Requirements (${reqs.length}) ---`);
    reqs.forEach((r) => {
      console.log({
        id: r._id.toString(),
        companyName: r.companyName,
        advisorId: r.advisorId ? r.advisorId.toString() : "MISSING",
        type: r.type,
        status: r.status,
      });
    });

    const apps = await mongoose.connection.collection("campaignapplications").find({}).toArray();
    console.log(`\n--- Campaign Applications (${apps.length}) ---`);
    apps.forEach((a) => {
      console.log({
        id: a._id.toString(),
        campaign: a.campaign ? a.campaign.toString() : "MISSING",
        campaignOwner: a.campaignOwner ? a.campaignOwner.toString() : "MISSING",
        applicant: a.applicant ? a.applicant.toString() : "MISSING",
        applicantName: a.applicantName,
        message: a.message,
        status: a.status,
      });
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Debug error:", err);
    process.exit(1);
  }
}

debug();
