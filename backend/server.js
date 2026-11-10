
require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");

const {
    pool,
    initializeDatabase,
    checkDatabase
} = require("./db");

const {
    router: authRouter,
    sessionMiddleware
} = require("./routes/auth");

const notesRouter = require("./routes/notes");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const production = process.env.NODE_ENV === "production";

// REMOVE CHATGPT TRACKING PARAMETER PERMANENTLY
app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
        return next();
    }

    try {
        const url = new URL(req.originalUrl, "http://localhost");

        let changed = false;

        for (const key of [...url.searchParams.keys()]) {
            if (key.toLowerCase() === "utm_source") {
                url.searchParams.delete(key);
                changed = true;
            }
        }

        if (changed) {
            const cleanUrl = url.pathname + url.search;

            return res.redirect(308, cleanUrl);
        }

        next();

    } catch (error) {
        next(error);
    }
});

// PRODUCTION CONFIGURATION
if (
    !process.env.SESSION_SECRET ||
    Buffer.byteLength(process.env.SESSION_SECRET, "utf8") < 32
) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes.");
}

if (production) {
    if (!process.env.APP_ORIGIN) {
        throw new Error("APP_ORIGIN is required in production.");
    }

    try {
        const parsed = new URL(process.env.APP_ORIGIN);

        if (
            parsed.protocol !== "https:" ||
            parsed.origin !== process.env.APP_ORIGIN
        ) {
            throw new Error(
                "APP_ORIGIN must be an HTTPS origin without a trailing path."
            );
        }
    } catch (error) {
        throw new Error(`Invalid APP_ORIGIN: ${error.message}`);
    }

    app.set("trust proxy", 1);
}

// SECURITY HEADERS
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"]
        }
    }
}));

// REQUEST BODY
app.use(express.json({ limit: "100kb" }));

app.use(express.urlencoded({
    extended: false,
    limit: "100kb"
}));

// PRIVATE DATA CACHE CONTROL
app.use(["/api/auth", "/notes"], (req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
});

// SESSION MANAGEMENT
app.use(sessionMiddleware);

// CSRF ORIGIN CHECK
app.use((req, res, next) => {
    const safeMethods = ["GET", "HEAD", "OPTIONS"];

    if (safeMethods.includes(req.method)) {
        return next();
    }

    const origin = req.get("Origin");

    if (!origin) {
        return next();
    }

    try {
        const allowedOrigin = production
            ? process.env.APP_ORIGIN
            : `${req.protocol}://${req.get("host")}`;

        if (new URL(origin).origin !== new URL(allowedOrigin).origin) {
            return res.status(403).json({
                error: "Cross-origin request blocked."
            });
        }

        next();

    } catch {
        res.status(403).json({
            error: "Invalid request origin."
        });
    }
});

// AUTHENTICATION API
app.use("/api/auth", authRouter);

// NOTES API
app.use("/notes", notesRouter);

// HEALTH CHECK
app.get("/api/health", async (req, res) => {
    try {
        const database = await checkDatabase();

        res.status(200).json({
            status: "OK",
            database: "connected",
            timestamp: database.database_time
        });

    } catch (error) {
        console.error("Database health check failed:", error.message);

        res.status(503).json({
            status: "ERROR",
            database: "disconnected"
        });
    }
});

// FRONTEND
app.use(express.static(path.join(__dirname, "../frontend")));

// API 404
app.use((req, res, next) => {
    if (
        req.path.startsWith("/api/") ||
        req.path.startsWith("/notes")
    ) {
        return res.status(404).json({
            error: "API endpoint not found."
        });
    }

    next();
});

// PAGE 404
app.use((req, res) => {
    res.status(404).send("Page not found.");
});

// ERROR HANDLER
app.use((error, req, res, next) => {
    console.error("Application error:", error);

    if (res.headersSent) {
        return next(error);
    }

    if (error instanceof SyntaxError && error.status === 400) {
        return res.status(400).json({
            error: "Invalid JSON request."
        });
    }

    res.status(500).json({
        error: "An unexpected server error occurred."
    });
});

// SERVER STARTUP
async function startServer() {
    try {
        await initializeDatabase();
        await checkDatabase();

        const server = app.listen(PORT, "0.0.0.0", () => {
            console.log("--------------------------------");
            console.log("       QUICK NOTE 2.0");
            console.log("--------------------------------");
            console.log(`Server running on port ${PORT}`);
            console.log("PostgreSQL connected.");
            console.log("Authentication enabled.");
            console.log("Private note workspaces enabled.");
            console.log("Tracking parameter cleanup enabled.");
            console.log("--------------------------------");
        });

        async function shutdown(signal) {
            console.log(`${signal}: shutting down...`);

            server.close(async () => {
                await pool.end();
                process.exit(0);
            });

            setTimeout(() => process.exit(1), 10000).unref();
        }

        process.on("SIGINT", () => shutdown("SIGINT"));
        process.on("SIGTERM", () => shutdown("SIGTERM"));

    } catch (error) {
        console.error("Startup failed:", error);
        await pool.end();
        process.exit(1);
    }
}

startServer();
