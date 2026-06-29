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
	smtpHost: process.env.SMTP_HOST,
	smtpPort: Number(process.env.SMTP_PORT) || 587,
	smtpUser: process.env.SMTP_USER,
	smtpPass: process.env.SMTP_PASS,
	smtpFrom: process.env.SMTP_FROM,
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
