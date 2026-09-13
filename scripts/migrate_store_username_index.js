import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/fa-aggregator";

async function migrateIndexes() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB:", mongoose.connection.name);

    const collection = mongoose.connection.collection("businessrequirements");
    const indexes = await collection.indexes();
    console.log("Existing indexes on businessrequirements:", indexes.map((i) => ({ name: i.name, key: i.key, unique: i.unique })));

    // Look for unique index on storeUsername alone
    const legacyUniqueIndex = indexes.find(
      (idx) => idx.key && idx.key.storeUsername === 1 && !idx.key.type && idx.unique,
    );

    if (legacyUniqueIndex) {
      console.log(`Dropping legacy unique index: ${legacyUniqueIndex.name}...`);
      await collection.dropIndex(legacyUniqueIndex.name);
      console.log("Legacy unique index dropped successfully.");
    } else {
      console.log("No legacy unique single-field storeUsername index found.");
    }

    // Ensure non-unique storeUsername index exists for fast queries
    await collection.createIndex({ storeUsername: 1 }, { background: true });
    console.log("Created/Ensured non-unique index { storeUsername: 1 }.");

    // Create compound unique index on { storeUsername: 1, type: 1 }
    await collection.createIndex(
      { storeUsername: 1, type: 1 },
      { unique: true, background: true },
    );
    console.log("Created/Ensured compound unique index { storeUsername: 1, type: 1 }.");

    const updatedIndexes = await collection.indexes();
    console.log("Updated indexes:", updatedIndexes.map((i) => ({ name: i.name, key: i.key, unique: i.unique })));

    await mongoose.disconnect();
    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateIndexes();
