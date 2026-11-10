
const AUTH_URL = "/api/auth";
const NOTES_URL = "/notes";

// AUTH ELEMENTS
const authScreen = document.getElementById("auth-screen");
const dashboard = document.getElementById("dashboard");
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authSubmit = document.getElementById("auth-submit");
const authMessage = document.getElementById("auth-message");
const passwordHint = document.getElementById("password-hint");
const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");
const userEmail = document.getElementById("user-email");
const logoutButton = document.getElementById("logout-button");

let authMode = "login";
let notes = [];
let editingNoteId = null;
let toastTimer = null;

// DASHBOARD ELEMENTS
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("note-title");
const contentInput = document.getElementById("note-content");
const notesGrid = document.getElementById("notes-grid");
const noteCount = document.getElementById("note-count");
const searchInput = document.getElementById("search-input");
const saveButton = document.getElementById("save-button");
const toast = document.getElementById("toast");

// VIEW DIALOG
const viewDialog = document.getElementById("view-dialog");
const viewTitle = document.getElementById("view-title");
const viewContent = document.getElementById("view-content");
const viewCreated = document.getElementById("view-created");
const viewUpdated = document.getElementById("view-updated");

// EDIT DIALOG
const editDialog = document.getElementById("edit-dialog");
const editForm = document.getElementById("edit-form");
const editTitleInput = document.getElementById("edit-title");
const editContentInput = document.getElementById("edit-content");
const updateButton = document.getElementById("update-button");

// API HELPER
async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options
    });

    const data = await response.json().catch(() => null);

    if (response.status === 401 && url.startsWith(NOTES_URL)) {
        showAuthScreen();
    }

    if (!response.ok) {
        throw new Error(data?.error || "Something went wrong.");
    }

    return data;
}

// AUTH MESSAGE
function showAuthMessage(message, isError = true) {
    authMessage.textContent = message;
    authMessage.className = isError
        ? "auth-message error"
        : "auth-message success";
}

// SWITCH AUTH MODE
function setAuthMode(mode) {
    authMode = mode;

    authForm.reset();
    showAuthMessage("");

    const isLogin = mode === "login";

    loginTab.classList.toggle("active", isLogin);
    registerTab.classList.toggle("active", !isLogin);

    authTitle.textContent = isLogin
        ? "Welcome back."
        : "Create your account.";

    authSubtitle.textContent = isLogin
        ? "Sign in to access your personal workspace."
        : "Start your own private note-taking space.";

    authSubmit.textContent = isLogin
        ? "Login to Workspace"
        : "Create Account";

    authPassword.autocomplete = isLogin
        ? "current-password"
        : "new-password";

    passwordHint.textContent = isLogin
        ? "Enter your account password."
        : "Use at least 10 characters.";

    authPassword.minLength = isLogin ? 1 : 10;
}

loginTab.addEventListener("click", () => setAuthMode("login"));
registerTab.addEventListener("click", () => setAuthMode("register"));

// SHOW AUTH SCREEN
function showAuthScreen() {
    dashboard.classList.add("hidden");
    authScreen.classList.remove("hidden");

    notes = [];
    noteCount.textContent = "0";
    notesGrid.replaceChildren();

    authForm.reset();
    showAuthMessage("");
    setAuthMode("login");
}

// SHOW DASHBOARD
async function showDashboard(user) {
    authScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");

    userEmail.textContent = user.email;

    await loadNotes();
}

// REGISTRATION AND LOGIN
authForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = authEmail.value.trim();
    const password = authPassword.value;

    authSubmit.disabled = true;
    authSubmit.textContent = authMode === "login"
        ? "Signing in..."
        : "Creating account...";

    try {
        const endpoint = authMode === "login"
            ? "/login"
            : "/register";

        const result = await apiRequest(`${AUTH_URL}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        showAuthMessage(result.message, false);

        await showDashboard(result.user);

    } catch (error) {
        showAuthMessage(error.message);

    } finally {
        authSubmit.disabled = false;
        authSubmit.textContent = authMode === "login"
            ? "Login to Workspace"
            : "Create Account";
    }
});

// LOGOUT
logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "Logging out...";

    try {
        await apiRequest(`${AUTH_URL}/logout`, {
            method: "POST"
        });

        showAuthScreen();

    } catch (error) {
        showToast(error.message);

    } finally {
        logoutButton.disabled = false;
        logoutButton.textContent = "Logout";
    }
});

// RESTORE SESSION AFTER PAGE REFRESH
async function initializeApp() {
    try {
        const result = await apiRequest(`${AUTH_URL}/me`);

        if (result.authenticated && result.user) {
            await showDashboard(result.user);
        } else {
            showAuthScreen();
        }

    } catch (error) {
        console.error("Session restoration failed:", error);
        showAuthScreen();
        showAuthMessage("Unable to connect. Please refresh the page.");
    }
}

// NOTIFICATIONS
function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// DATE FORMAT
function formatDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

// CREATE NOTE CARD
function createNoteCard(note) {
    const card = document.createElement("article");
    card.className = "note-card";

    const title = document.createElement("h3");
    title.textContent = note.title;

    const content = document.createElement("p");
    content.className = "note-content";
    content.textContent = note.content || "No additional details.";

    const footer = document.createElement("div");
    footer.className = "note-footer";

    const date = document.createElement("span");
    date.className = "note-date";
    date.textContent = formatDate(note.createdAt);

    const actions = document.createElement("div");
    actions.className = "note-actions";

    [
        ["view", "View", "view-button"],
        ["edit", "Edit", "edit-button"],
        ["delete", "Delete", "delete-button"]
    ].forEach(([action, label, className]) => {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = label;
        button.className = className;
        button.dataset.action = action;
        button.dataset.id = note.id;

        actions.appendChild(button);
    });

    footer.append(date, actions);
    card.append(title, content, footer);

    return card;
}

// RENDER NOTES
function renderNotes() {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = notes.filter(note =>
        note.title.toLowerCase().includes(query) ||
        (note.content || "").toLowerCase().includes(query)
    );

    noteCount.textContent = notes.length;
    notesGrid.replaceChildren();

    if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        const heading = document.createElement("h3");
        const description = document.createElement("p");

        heading.textContent = notes.length === 0
            ? "No notes yet"
            : "No matching notes";

        description.textContent = notes.length === 0
            ? "Create your first note using the editor above."
            : "Try searching with another keyword.";

        empty.append(heading, description);
        notesGrid.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();

    filtered.forEach(note => {
        fragment.appendChild(createNoteCard(note));
    });

    notesGrid.appendChild(fragment);
}

// LOAD USER NOTES
async function loadNotes() {
    notesGrid.textContent = "Loading your notes...";

    try {
        const data = await apiRequest(NOTES_URL);

        if (!Array.isArray(data)) {
            throw new Error("Invalid notes response.");
        }

        notes = data;
        renderNotes();

    } catch (error) {
        console.error(error);
        notesGrid.textContent = "Could not load your notes.";
        showToast(error.message);
    }
}

// CREATE NOTE
noteForm.addEventListener("submit", async event => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const content = contentInput.value;

    if (!title) {
        showToast("Please enter a note title.");
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const newNote = await apiRequest(NOTES_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ title, content })
        });

        notes.unshift(newNote);

        noteForm.reset();
        searchInput.value = "";

        renderNotes();
        showToast("Note saved successfully!");

    } catch (error) {
        showToast(error.message);

    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = "<span>+</span> Save Note";
    }
});

// VIEW NOTE
function openViewDialog(id) {
    const note = notes.find(item => item.id === id);

    if (!note) {
        showToast("Note not found.");
        return;
    }

    viewTitle.textContent = note.title;
    viewContent.textContent = note.content || "No additional content.";
    viewCreated.textContent = formatDate(note.createdAt);
    viewUpdated.textContent = formatDate(note.updatedAt || note.createdAt);

    viewDialog.showModal();
}

function closeViewDialog() {
    if (viewDialog.open) viewDialog.close();
}

document.getElementById("close-view").addEventListener("click", closeViewDialog);
document.getElementById("view-done").addEventListener("click", closeViewDialog);

viewDialog.addEventListener("click", event => {
    if (event.target === viewDialog) closeViewDialog();
});

// EDIT NOTE
function openEditDialog(id) {
    const note = notes.find(item => item.id === id);

    if (!note) {
        showToast("Note not found.");
        return;
    }

    editingNoteId = id;
    editTitleInput.value = note.title;
    editContentInput.value = note.content || "";

    editDialog.showModal();
}

function closeEditDialog() {
    if (editDialog.open) editDialog.close();
}

editDialog.addEventListener("close", () => {
    editingNoteId = null;
    editForm.reset();
});

document.getElementById("cancel-edit").addEventListener("click", closeEditDialog);
document.getElementById("cancel-edit-icon").addEventListener("click", closeEditDialog);

// UPDATE NOTE
editForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!editingNoteId) return;

    const id = editingNoteId;
    const title = editTitleInput.value.trim();
    const content = editContentInput.value;

    if (!title) {
        showToast("Title is required.");
        return;
    }

    updateButton.disabled = true;
    updateButton.textContent = "Updating...";

    try {
        const updated = await apiRequest(
            `${NOTES_URL}/${encodeURIComponent(id)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ title, content })
            }
        );

        notes = notes.map(note => note.id === id ? updated : note);

        closeEditDialog();
        renderNotes();
        showToast("Note updated successfully!");

    } catch (error) {
        showToast(error.message);

    } finally {
        updateButton.disabled = false;
        updateButton.textContent = "Save Changes";
    }
});

// DELETE NOTE
async function deleteNote(id, button) {
    if (!confirm("Are you sure you want to delete this note?")) {
        return;
    }

    button.disabled = true;
    button.textContent = "Deleting...";

    try {
        await apiRequest(`${NOTES_URL}/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        notes = notes.filter(note => note.id !== id);
        renderNotes();
        showToast("Note deleted successfully!");

    } catch (error) {
        showToast(error.message);
        button.disabled = false;
        button.textContent = "Delete";
    }
}

// NOTE ACTIONS
notesGrid.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "view") openViewDialog(id);
    if (action === "edit") openEditDialog(id);
    if (action === "delete") deleteNote(id, button);
});

// SEARCH
searchInput.addEventListener("input", renderNotes);

// START APPLICATION
initializeApp();

console.log("Quick Note 2.0 initialized.");
