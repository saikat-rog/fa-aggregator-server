import dotenv from "dotenv";
import path from "path";

import fs from "fs";

const nodeEnv = process.env.NODE_ENV || "development";

// Prioritized env files: specific env overrides first, then .env.local, then generic .env
const envFiles = [
	process.env.ENV_FILE,
	nodeEnv === "production" ? ".env.prod" : ".env.dev",
	nodeEnv === "production" ? ".env.production" : ".env.development",
	".env.local",
	".env"
].filter(Boolean);

for (const file of envFiles) {
	const fullPath = path.resolve(process.cwd(), file);
	if (fs.existsSync(fullPath)) {
		dotenv.config({ path: fullPath });
	}
}

// Fallback: also load default .env if not yet loaded
dotenv.config();

const parseCsv = (value) =>
	value
		?.split(",")
		.map((item) => item.trim())
		.filter(Boolean) || [];

const coreEnv = {
	port: Number(process.env.PORT) || 5000,
	mongoUri: process.env.MONGO_URI,
	jwtSecret: process.env.JWT_SECRET,
	adminEmail: process.env.ADMIN_EMAIL,
	adminPassword: process.env.ADMIN_PASSWORD,
	corsOrigins: parseCsv(process.env.CORS_ORIGINS),
	nodeEnv,
	accessTokenExpiry: "70m",
	refreshTokenExpiry: "7d"
};

const socialFetchEnv = {
	socialFetchInstagramApiUrl: process.env.SOCIAL_FETCH_INSTAGRAM_API_URL,
	socialFetchTikTokApiUrl: process.env.SOCIAL_FETCH_TIKTOK_API_URL,
	socialFetchLinkedInApiUrl: process.env.SOCIAL_FETCH_LINKEDIN_API_URL,
	socialFetchTwitterApiUrl: process.env.SOCIAL_FETCH_TWITTER_API_URL,
	socialFetchFacebookApiUrl: process.env.SOCIAL_FETCH_FACEBOOK_API_URL,
	socialFetchYouTubeApiUrl: process.env.SOCIAL_FETCH_YOUTUBE_API_URL,
	socialFetchTelegramApiUrl: process.env.SOCIAL_FETCH_TELEGRAM_API_URL,
	socialFetchApiKey: process.env.SOCIAL_FETCH_API_KEY,
	socialFetchApprovalMaxRetries: Number(process.env.SOCIAL_FETCH_APPROVAL_MAX_RETRIES) || 3,
	socialFetchMonthlyMaxRetries: Number(process.env.SOCIAL_FETCH_MONTHLY_MAX_RETRIES) || 3,
	socialFetchMonthlyIntervalDays: Number(process.env.SOCIAL_FETCH_MONTHLY_INTERVAL_DAYS) || 30,
	socialFetchCronMs: Number(process.env.SOCIAL_FETCH_CRON_MS) || 60 * 60 * 1000,
};

const googleAuthEnv = {
	googleClientId: process.env.GOOGLE_CLIENT_ID,
};

const smtpEnv = {
	brevoApiKey: process.env.BREVO_API_KEY,
	smtpHost: process.env.SMTP_HOST,
	smtpPort: Number(process.env.SMTP_PORT) || 587,
	smtpUser: process.env.SMTP_USER,
	smtpPass: process.env.SMTP_PASS,
	smtpFrom: process.env.SMTP_FROM || '"Folksmint" <info.folksmint@gmail.com>',
};

const env = {
	...coreEnv,
	...socialFetchEnv,
	...googleAuthEnv,
	...smtpEnv,
};

const requiredEnvKeys = ["mongoUri", "jwtSecret", "adminEmail", "adminPassword"];
for (const key of requiredEnvKeys) {
	if (!env[key]) {
		throw new Error(`Missing required environment variable: ${key.toUpperCase()}`);
	}
}

export default env;
