import express from "express";
import net from "net";
import cookieParser from "cookie-parser";
import cors from "cors";
import env from "./config/env.js";
import connectDB from "./config/db.js";
import apiRoutes from "./routes/index.js";
import { startAdvisorSocialMetricsRefreshJob } from "./common/services/advisorSocialSync.service.js";
import {
	normalizeResponse,
	notFoundHandler,
	errorHandler
} from "./common/middleware/response.js";

const corsOrigins = env.corsOrigins;

const corsOptions = {
	credentials: true,
	origin(origin, callback) {
		if (!origin || corsOrigins.includes(origin)) {
			callback(null, true);
			return;
		}

		callback(new Error("Not allowed by CORS"));
	}
};

const isPortAvailable = (port) => {
	return new Promise((resolve, reject) => {
		const tester = net.createServer();

		tester.once("error", (error) => {
			if (error.code === "EADDRINUSE") {
				resolve(false);
				return;
			}

			reject(error);
		});

		tester.once("listening", () => {
			tester.close(() => resolve(true));
		});

		tester.listen(port, "0.0.0.0");
	});
};

const startServer = async () => {
	try {
		const PORT = env.port;

		const available = await isPortAvailable(PORT);
		if (!available) {
			console.error(`Port ${PORT} already in use`);
			process.exit(1);
		}

		// DB connection
		await connectDB();
		console.log("Database connected");
		startAdvisorSocialMetricsRefreshJob();

		const app = express();
		app.set("trust proxy", true);
		app.use(cors(corsOptions));
		app.use(normalizeResponse);
		app.use(express.json());
		app.use(cookieParser());

		app.use("/api", apiRoutes);
		app.use(notFoundHandler);
		app.use(errorHandler);

		const server = app.listen(PORT, () => {
			console.log(`Server successfully started on port ${PORT} (pid ${process.pid})`);
		});

		// server errors
		server.on("error", (error) => {
			if (error.code === "EADDRINUSE") {
				console.error(`Port ${PORT} already in use`);
			} else {
				console.error("Server startup error:", error);
			}
			process.exit(1);
		});

	} catch (error) {
		console.error("Startup failed:", error);
		process.exit(1);
	}
};

// global crash handlers
process.on("uncaughtException", (err) => {
	console.error("Uncaught Exception:", err);
	process.exit(1);
});

process.on("unhandledRejection", (err) => {
	console.error("Unhandled Rejection:", err);
	process.exit(1);
});

startServer();
