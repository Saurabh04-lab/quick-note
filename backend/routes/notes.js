
const express = require("express");
const { pool } = require("../db");
const { requireAuth } = require("./auth");

const router = express.Router();

router.use(requireAuth);

function validateNote(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { error: "Invalid request body." };
    }

    const title = typeof body.title === "string"
        ? body.title.trim()
        : "";

    const content = body.content === undefined
        ? ""
        : typeof body.content === "string"
            ? body.content
            : null;

    if (!title) {
        return { error: "Note title is required." };
    }

    if (title.length > 150) {
        return { error: "Title cannot exceed 150 characters." };
    }

    if (content === null) {
        return { error: "Content must be text." };
    }

    if (content.length > 50000) {
        return { error: "Content cannot exceed 50,000 characters." };
    }

    return { title, content };
}

// GET USER'S NOTES
router.get("/", async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT
                id,
                title,
                content,
                created_at AS "createdAt",
                updated_at AS "updatedAt"
             FROM notes
             WHERE owner_id = $1
             ORDER BY updated_at DESC`,
            [req.session.user.id]
        );

        res.json(result.rows);

    } catch (error) {
        next(error);
    }
});

// CREATE NOTE
router.post("/", async (req, res, next) => {
    try {
        const validation = validateNote(req.body);

        if (validation.error) {
            return res.status(400).json({
                error: validation.error
            });
        }

        const result = await pool.query(
            `INSERT INTO notes (owner_id, title, content)
             VALUES ($1, $2, $3)
             RETURNING
                id,
                title,
                content,
                created_at AS "createdAt",
                updated_at AS "updatedAt"`,
            [
                req.session.user.id,
                validation.title,
                validation.content
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        next(error);
    }
});

// UPDATE NOTE
router.put("/:id", async (req, res, next) => {
    try {
        const validation = validateNote(req.body);

        if (validation.error) {
            return res.status(400).json({
                error: validation.error
            });
        }

        const result = await pool.query(
            `UPDATE notes
             SET title = $1,
                 content = $2,
                 updated_at = NOW()
             WHERE id = $3
               AND owner_id = $4
             RETURNING
                id,
                title,
                content,
                created_at AS "createdAt",
                updated_at AS "updatedAt"`,
            [
                validation.title,
                validation.content,
                req.params.id,
                req.session.user.id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "Note not found."
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        if (error.code === "22P02") {
            return res.status(400).json({
                error: "Invalid note ID."
            });
        }

        next(error);
    }
});

// DELETE NOTE
router.delete("/:id", async (req, res, next) => {
    try {
        const result = await pool.query(
            `DELETE FROM notes
             WHERE id = $1
               AND owner_id = $2
             RETURNING id`,
            [
                req.params.id,
                req.session.user.id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "Note not found."
            });
        }

        res.json({
            message: "Note deleted successfully.",
            id: result.rows[0].id
        });

    } catch (error) {
        if (error.code === "22P02") {
            return res.status(400).json({
                error: "Invalid note ID."
            });
        }

        next(error);
    }
});

module.exports = router;
