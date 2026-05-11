import dotenv from "dotenv";
import path from "path";

const nodeEnv = process.env.NODE_ENV || "development";
const envFile = nodeEnv === "production" ? ".env.prod" : ".env.local";

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const parseCsv = (value) =>
	value
		?.split(",")
		.map((item) => item.trim())
		.filter(Boolean) || [];

const env = {
	port: Number(process.env.PORT) || 5000,
	mongoUri: process.env.MONGO_URI,
	jwtSecret: process.env.JWT_SECRET,
	adminEmail: process.env.ADMIN_EMAIL,
	adminPassword: process.env.ADMIN_PASSWORD,
	corsOrigins: parseCsv(process.env.CORS_ORIGINS),
	nodeEnv,
	accessTokenExpiry: "20m",
	refreshTokenExpiry: "7d"
};

const requiredEnvKeys = ["mongoUri", "jwtSecret", "adminEmail", "adminPassword"];
for (const key of requiredEnvKeys) {
	if (!env[key]) {
		throw new Error(`Missing required environment variable: ${key.toUpperCase()}`);
	}
}

export default env;
