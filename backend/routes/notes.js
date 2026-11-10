
const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const router = express.Router();

const NOTES_FILE = path.join(__dirname, "../../data/notes.json");

// Read notes from JSON storage
async function readNotes() {
    try {
        const data = await fs.readFile(NOTES_FILE, "utf8");
        const notes = JSON.parse(data);

        if (!Array.isArray(notes)) {
            throw new Error("Invalid notes database format.");
        }

        return notes;
    } catch (error) {
        if (error.code === "ENOENT") {
            await fs.mkdir(path.dirname(NOTES_FILE), {
                recursive: true
            });

            await fs.writeFile(NOTES_FILE, "[]", "utf8");
            return [];
        }

        throw error;
    }
}

// Save notes to JSON storage
async function saveNotes(notes) {
    await fs.mkdir(path.dirname(NOTES_FILE), {
        recursive: true
    });

    await fs.writeFile(
        NOTES_FILE,
        JSON.stringify(notes, null, 2),
        "utf8"
    );
}

// Validate incoming note data
function validateNote(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { error: "Invalid request body." };
    }

    const title =
        typeof body.title === "string"
            ? body.title.trim()
            : "";

    const content =
        body.content === undefined
            ? ""
            : typeof body.content === "string"
                ? body.content.trim()
                : null;

    if (!title) {
        return { error: "Title is required." };
    }

    if (content === null) {
        return { error: "Content must be text." };
    }

    if (title.length > 100) {
        return { error: "Title cannot exceed 100 characters." };
    }

    if (content.length > 2000) {
        return { error: "Content cannot exceed 2000 characters." };
    }

    return { title, content };
}

// GET /notes - Retrieve all notes
router.get("/", async (req, res) => {
    try {
        const notes = await readNotes();

        res.status(200).json(notes);
    } catch (error) {
        console.error("GET notes error:", error);

        res.status(500).json({
            error: "Could not retrieve notes."
        });
    }
});

// POST /notes - Create a new note
router.post("/", async (req, res) => {
    try {
        const validation = validateNote(req.body);

        if (validation.error) {
            return res.status(400).json({
                error: validation.error
            });
        }

        const notes = await readNotes();
        const now = new Date().toISOString();

        const newNote = {
            id: randomUUID(),
            title: validation.title,
            content: validation.content,
            createdAt: now,
            updatedAt: now
        };

        notes.unshift(newNote);

        await saveNotes(notes);

        res.status(201).json(newNote);
    } catch (error) {
        console.error("POST note error:", error);

        res.status(500).json({
            error: "Could not create note."
        });
    }
});

// PUT /notes/:id - Update an existing note
router.put("/:id", async (req, res) => {
    try {
        const validation = validateNote(req.body);

        if (validation.error) {
            return res.status(400).json({
                error: validation.error
            });
        }

        const notes = await readNotes();

        const noteIndex = notes.findIndex(
            note => note.id === req.params.id
        );

        if (noteIndex === -1) {
            return res.status(404).json({
                error: "Note not found."
            });
        }

        const updatedNote = {
            ...notes[noteIndex],
            title: validation.title,
            content: validation.content,
            updatedAt: new Date().toISOString()
        };

        notes[noteIndex] = updatedNote;

        await saveNotes(notes);

        res.status(200).json(updatedNote);
    } catch (error) {
        console.error("PUT note error:", error);

        res.status(500).json({
            error: "Could not update note."
        });
    }
});

// DELETE /notes/:id - Delete a note
router.delete("/:id", async (req, res) => {
    try {
        const notes = await readNotes();

        const noteExists = notes.some(
            note => note.id === req.params.id
        );

        if (!noteExists) {
            return res.status(404).json({
                error: "Note not found."
            });
        }

        const updatedNotes = notes.filter(
            note => note.id !== req.params.id
        );

        await saveNotes(updatedNotes);

        res.status(200).json({
            message: "Note deleted successfully.",
            id: req.params.id
        });
    } catch (error) {
        console.error("DELETE note error:", error);

        res.status(500).json({
            error: "Could not delete note."
        });
    }
});

module.exports = router;
