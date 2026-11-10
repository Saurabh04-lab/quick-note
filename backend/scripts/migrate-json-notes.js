
require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");

const { pool } = require("../db");

const NOTES_FILE = path.join(
    __dirname,
    "../../data/notes.json"
);

function parseDate(value) {
    const date = new Date(value || "");

    return Number.isNaN(date.getTime())
        ? new Date()
        : date;
}

async function main() {
    const args = process.argv.slice(2);

    const preview = args.includes("--preview");
    const importing = args.includes("--import");
    const importAll = args.includes("--all");

    const idsPosition = args.indexOf("--ids");

    let requestedIds = [];

    if (idsPosition !== -1) {
        requestedIds = (args[idsPosition + 1] || "")
            .split(",")
            .map(id => id.trim())
            .filter(Boolean);
    }

    if (preview === importing) {
        throw new Error(
            "Use exactly one option: --preview or --import."
        );
    }

    if (importing && !importAll && requestedIds.length === 0) {
        throw new Error(
            "Specify --ids with selected note IDs, or explicitly use --all."
        );
    }

    let raw;

    try {
        raw = await fs.readFile(NOTES_FILE, "utf8");
    } catch (error) {
        if (error.code === "ENOENT") {
            throw new Error("data/notes.json was not found.");
        }

        throw error;
    }

    const notes = JSON.parse(raw);

    if (!Array.isArray(notes)) {
        throw new Error("Legacy JSON data must contain an array.");
    }

    console.log(`Legacy notes found: ${notes.length}`);

    if (preview) {
        console.log("\nPREVIEW ONLY - Nothing will be imported.\n");

        console.table(
            notes.map((note, index) => ({
                index,
                id: String(note.id || "MISSING ID"),
                title: String(note.title || "(No title)").slice(0, 50),
                contentLength: typeof note.content === "string"
                    ? note.content.length
                    : 0,
                createdAt: note.createdAt || "(missing)"
            }))
        );

        console.log("Review the IDs before importing.");
        return;
    }

    const ownerEmail = process.env.MIGRATE_OWNER_EMAIL;

    if (!ownerEmail) {
        throw new Error(
            "Set MIGRATE_OWNER_EMAIL before importing."
        );
    }

    const ownerResult = await pool.query(
        "SELECT id, email FROM users WHERE email = $1",
        [ownerEmail.trim().toLowerCase()]
    );

    if (ownerResult.rowCount === 0) {
        throw new Error(
            "Destination user does not exist. Register that account first."
        );
    }

    const owner = ownerResult.rows[0];

    const selectedNotes = importAll
        ? notes
        : notes.filter(note =>
            requestedIds.includes(String(note.id))
        );

    if (!selectedNotes.length) {
        throw new Error("No matching notes were selected.");
    }

    if (!importAll) {
        const foundIds = new Set(
            selectedNotes.map(note => String(note.id))
        );

        const missingIds = requestedIds.filter(id => !foundIds.has(id));

        if (missingIds.length) {
            throw new Error(
                `These requested IDs were not found: ${missingIds.join(", ")}`
            );
        }
    }

    const client = await pool.connect();

    let imported = 0;
    let skipped = 0;

    try {
        await client.query("BEGIN");

        for (const note of selectedNotes) {
            const sourceId = String(note.id || "").trim();
            const title = typeof note.title === "string"
                ? note.title.trim()
                : "";

            const content = typeof note.content === "string"
                ? note.content
                : "";

            if (!sourceId || !title || title.length > 150 || content.length > 50000) {
                skipped++;
                console.log(`Skipped invalid legacy record: ${sourceId || "missing ID"}`);
                continue;
            }

            const previous = await client.query(
                `SELECT 1
                 FROM legacy_note_migrations
                 WHERE owner_id = $1
                   AND source_id = $2`,
                [owner.id, sourceId]
            );

            if (previous.rowCount > 0) {
                skipped++;
                continue;
            }

            const createdAt = parseDate(note.createdAt);
            const updatedAt = parseDate(note.updatedAt || note.createdAt);

            const inserted = await client.query(
                `INSERT INTO notes (
                    owner_id,
                    title,
                    content,
                    created_at,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id`,
                [
                    owner.id,
                    title,
                    content,
                    createdAt,
                    updatedAt
                ]
            );

            await client.query(
                `INSERT INTO legacy_note_migrations (
                    owner_id,
                    source_id,
                    imported_note_id
                )
                VALUES ($1, $2, $3)`,
                [
                    owner.id,
                    sourceId,
                    inserted.rows[0].id
                ]
            );

            imported++;
        }

        await client.query("COMMIT");

        console.log("\nMIGRATION COMPLETE");
        console.log("----------------------------");
        console.log(`Destination: ${owner.email}`);
        console.log(`Imported: ${imported}`);
        console.log(`Skipped: ${skipped}`);
        console.log("----------------------------");

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
}

main()
    .catch(error => {
        console.error("Migration failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
