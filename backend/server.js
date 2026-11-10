
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: "20kb" }));

// Health check API
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Quick Note API is running"
    });
});

// Notes REST API
app.use("/notes", require("./routes/notes"));

// Serve frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// Handle invalid JSON and server errors
app.use((error, req, res, next) => {
    console.error("Server error:", error);

    if (error instanceof SyntaxError && error.status === 400) {
        return res.status(400).json({
            error: "Invalid JSON request."
        });
    }

    res.status(500).json({
        error: "Internal server error."
    });
});

// Start Express server
app.listen(PORT, () => {
    console.log("--------------------------------");
    console.log("       QUICK NOTE SERVER");
    console.log("--------------------------------");
    console.log(`Server running: http://localhost:${PORT}`);
    console.log(`Health API: http://localhost:${PORT}/api/health`);
    console.log(`Notes API: http://localhost:${PORT}/notes`);
    console.log("--------------------------------");
});
