
const express = require("express");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const { rateLimit } = require("express-rate-limit");

const { pool } = require("../db");

const router = express.Router();

const PgSession = connectPgSimple(session);

const production = process.env.NODE_ENV === "production";

const SESSION_NAME = production
    ? "__Host-quicknote.sid"
    : "quicknote.sid";

const cookieOptions = {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
};

// PostgreSQL session storage
const sessionMiddleware = session({
    name: SESSION_NAME,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: new PgSession({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: true,
        pruneSessionInterval: 15 * 60
    }),
    cookie: cookieOptions
});

// Limit repeated authentication attempts.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: "Too many attempts. Please try again later."
        });
    }
});

function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            error: "Please log in to access your workspace."
        });
    }

    next();
}

function validateEmail(value) {
    if (typeof value !== "string") return false;

    const email = value.trim();

    return (
        email.length <= 255 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
}

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        createdAt: user.created_at || user.createdAt
    };
}

// SESSION STATUS
router.get("/me", (req, res) => {
    if (!req.session.user) {
        return res.json({
            authenticated: false,
            user: null
        });
    }

    res.json({
        authenticated: true,
        user: req.session.user
    });
});

// REGISTER
router.post("/register", authLimiter, async (req, res, next) => {
    try {
        const email = typeof req.body?.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";

        const password = typeof req.body?.password === "string"
            ? req.body.password
            : "";

        if (!validateEmail(email)) {
            return res.status(400).json({
                error: "Please enter a valid email address."
            });
        }

        const passwordBytes = Buffer.byteLength(password, "utf8");

        if (passwordBytes < 10 || passwordBytes > 72) {
            return res.status(400).json({
                error: "Password must contain at least 10 characters and no more than 72 UTF-8 bytes."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (email, password_hash)
             VALUES ($1, $2)
             RETURNING id, email, created_at`,
            [email, passwordHash]
        );

        const user = publicUser(result.rows[0]);

        req.session.regenerate(error => {
            if (error) return next(error);

            req.session.user = {
                id: user.id,
                email: user.email
            };

            req.session.save(saveError => {
                if (saveError) return next(saveError);

                res.status(201).json({
                    message: "Account created successfully.",
                    user
                });
            });
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        next(error);
    }
});

// LOGIN
router.post("/login", authLimiter, async (req, res, next) => {
    try {
        const email = typeof req.body?.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";

        const password = typeof req.body?.password === "string"
            ? req.body.password
            : "";

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required."
            });
        }

        const result = await pool.query(
            `SELECT id, email, password_hash, created_at
             FROM users
             WHERE email = $1`,
            [email]
        );

        const user = result.rows[0];

        if (
            !user ||
            !(await bcrypt.compare(password, user.password_hash))
        ) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        const safeUser = publicUser(user);

        // Prevent session fixation.
        req.session.regenerate(error => {
            if (error) return next(error);

            req.session.user = {
                id: safeUser.id,
                email: safeUser.email
            };

            req.session.save(saveError => {
                if (saveError) return next(saveError);

                res.json({
                    message: "Login successful.",
                    user: safeUser
                });
            });
        });

    } catch (error) {
        next(error);
    }
});

// LOGOUT
router.post("/logout", (req, res, next) => {
    req.session.destroy(error => {
        if (error) return next(error);

        res.clearCookie(SESSION_NAME, {
            httpOnly: true,
            secure: production,
            sameSite: "lax",
            path: "/"
        });

        res.json({
            message: "Logged out successfully."
        });
    });
});

module.exports = {
    router,
    sessionMiddleware,
    requireAuth
};
