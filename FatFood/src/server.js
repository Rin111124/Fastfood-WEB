import "dotenv/config.js";
import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import fs from "fs";
import net from "net";
import { fileURLToPath } from "url";
import connectDB from "./config/connectDB.js";
import initApiRoutes from "./route/api/index.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolvePort = (value, defaultPort = 3000) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0 && parsed < 65536) {
    return parsed;
  }
  return defaultPort;
};

const preferredPort = resolvePort(process.env.PORT, 3000);

const isPortAvailable = (port) =>
  new Promise((resolve) => {
    const attemptListen = (host) => {
      const tester = net.createServer();
      tester.once("error", (error) => {
        if (host === "::" && error.code === "EADDRNOTAVAIL") {
          attemptListen("0.0.0.0");
          return;
        }
        if (error.code === "EADDRINUSE" || error.code === "EACCES") {
          resolve(false);
        } else {
          console.error(`Unexpected error while checking port ${port} on host ${host}:`, error);
          resolve(false);
        }
      });
      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port, host);
    };
    attemptListen("::");
  });

const findAvailablePort = async (startPort, attempts = 5) => {
  for (let i = 0; i < attempts; i += 1) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
};

// Configure CORS allow list from environment
const allowedOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`Blocked CORS request from origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration (in-memory store for development)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fatfood-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: Number(process.env.SESSION_MAX_AGE || 1000 * 60 * 60 * 4)
    }
  })
);

initApiRoutes(app);

app.get("/healthz", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const maybeServeFrontend = () => {
  const candidates = [];

  if (process.env.FRONTEND_STATIC_ROOT) {
    candidates.push(process.env.FRONTEND_STATIC_ROOT);
  }

  candidates.push(path.join(__dirname, "..", "..", "FE", "dist"));
  candidates.push(path.join(__dirname, "public"));

  const targetRoot = candidates.find((candidate) => {
    if (!candidate) return false;
    const indexPath = path.join(candidate, "index.html");
    return fs.existsSync(candidate) && fs.existsSync(indexPath);
  });

  if (!targetRoot) {
    console.warn(
      "No frontend build found. Run `npm run build` inside the FE project and set FRONTEND_STATIC_ROOT if needed."
    );
    return;
  }

  const indexFile = path.join(targetRoot, "index.html");
  console.log("Serving static frontend from:", targetRoot);

  app.use(express.static(targetRoot));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/healthz")) {
      return next();
    }
    return res.sendFile(indexFile);
  });
};

maybeServeFrontend();

const startServer = async () => {
  try {
    await connectDB();
    const portToUse = await findAvailablePort(preferredPort);
    if (portToUse !== preferredPort) {
      console.warn(
        `Port ${preferredPort} is busy. Server is starting on fallback port ${portToUse}.`
      );
    }
    process.env.PORT = String(portToUse);
    const server = app.listen(portToUse, () => {
      console.log(`Backend Node.js is running on port ${portToUse}`);
    });
    server.on("error", (error) => {
      console.error("Unhandled server error:", error?.message || error);
    });
  } catch (error) {
    console.error("Failed to start server:", error?.message || error);
    process.exit(1);
  }
};

startServer();
