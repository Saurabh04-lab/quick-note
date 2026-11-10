
const API_URL = "/notes";

// DOM Elements
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("note-title");
const contentInput = document.getElementById("note-content");
const notesGrid = document.getElementById("notes-grid");
const noteCount = document.getElementById("note-count");
const searchInput = document.getElementById("search-input");
const saveButton = document.getElementById("save-button");
const toast = document.getElementById("toast");

// View Dialog Elements
const viewDialog = document.getElementById("view-dialog");
const viewTitle = document.getElementById("view-title");
const viewContent = document.getElementById("view-content");
const viewCreated = document.getElementById("view-created");
const viewUpdated = document.getElementById("view-updated");
const closeViewButton = document.getElementById("close-view");
const viewDoneButton = document.getElementById("view-done");

// Edit Dialog Elements
const editDialog = document.getElementById("edit-dialog");
const editForm = document.getElementById("edit-form");
const editTitleInput = document.getElementById("edit-title");
const editContentInput = document.getElementById("edit-content");
const cancelEditButton = document.getElementById("cancel-edit");
const cancelEditIcon = document.getElementById("cancel-edit-icon");
const updateButton = document.getElementById("update-button");

// Application State
let notes = [];
let editingNoteId = null;
let toastTimer = null;


// SHOW NOTIFICATION
function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


// API REQUEST HELPER
async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.error || "Something went wrong."
        );
    }

    return data;
}


// FORMAT DATE
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

    // Title
    const title = document.createElement("h3");
    title.textContent = note.title;

    // Content preview
    const content = document.createElement("p");
    content.className = "note-content";
    content.textContent = note.content || "No additional details.";

    // Footer
    const footer = document.createElement("div");
    footer.className = "note-footer";

    const date = document.createElement("span");
    date.className = "note-date";
    date.textContent = formatDate(note.createdAt);

    // View Button
    const viewButton = document.createElement("button");
    viewButton.className = "view-button";
    viewButton.textContent = "View";
    viewButton.type = "button";
    viewButton.dataset.action = "view";
    viewButton.dataset.id = note.id;

    viewButton.setAttribute(
        "aria-label",
        `View note: ${note.title}`
    );

    // Edit Button
    const editButton = document.createElement("button");
    editButton.className = "edit-button";
    editButton.textContent = "Edit";
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.dataset.id = note.id;

    editButton.setAttribute(
        "aria-label",
        `Edit note: ${note.title}`
    );

    // Delete Button
    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = note.id;

    deleteButton.setAttribute(
        "aria-label",
        `Delete note: ${note.title}`
    );

    // Actions Container
    const actions = document.createElement("div");
    actions.className = "note-actions";

    actions.append(viewButton, editButton, deleteButton);

    footer.append(date, actions);

    card.append(title, content, footer);

    return card;
}


// RENDER NOTES
function renderNotes() {
    const query = searchInput.value.trim().toLowerCase();

    const filteredNotes = notes.filter(note => {
        return (
            note.title.toLowerCase().includes(query) ||
            (note.content || "").toLowerCase().includes(query)
        );
    });

    noteCount.textContent = notes.length;

    notesGrid.replaceChildren();

    if (filteredNotes.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        const heading = document.createElement("h3");
        const description = document.createElement("p");

        if (notes.length === 0) {
            heading.textContent = "No notes yet";
            description.textContent =
                "Create your first note using the editor above.";
        } else {
            heading.textContent = "No matching notes";
            description.textContent =
                "Try searching with a different keyword.";
        }

        empty.append(heading, description);
        notesGrid.appendChild(empty);

        return;
    }

    const fragment = document.createDocumentFragment();

    filteredNotes.forEach(note => {
        fragment.appendChild(createNoteCard(note));
    });

    notesGrid.appendChild(fragment);
}


// LOAD ALL NOTES
async function loadNotes() {
    notesGrid.textContent = "Loading your notes...";

    try {
        const data = await apiRequest(API_URL);

        if (!Array.isArray(data)) {
            throw new Error("Invalid notes response from server.");
        }

        notes = data;

        renderNotes();

    } catch (error) {
        console.error("Loading notes failed:", error);

        notesGrid.textContent =
            "Could not load notes. Please check the backend server.";

        showToast(error.message);
    }
}


// CREATE NOTE
noteForm.addEventListener("submit", async event => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title) {
        showToast("Please enter a note title.");
        titleInput.focus();
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const newNote = await apiRequest(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                content
            })
        });

        notes.unshift(newNote);

        noteForm.reset();
        searchInput.value = "";

        renderNotes();

        showToast("Note saved successfully!");

        titleInput.focus();

    } catch (error) {
        console.error("Creating note failed:", error);
        showToast(error.message);

    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = "<span>+</span> Save Note";
    }
});


// ====================================
// INDIVIDUAL NOTE VIEW - READ ONLY
// ====================================

// OPEN VIEW DIALOG
function openViewDialog(noteId) {
    const note = notes.find(item => item.id === noteId);

    if (!note) {
        showToast("Note not found.");
        return;
    }

    // Display note information
    viewTitle.textContent = note.title;

    viewContent.textContent =
        note.content || "This note has no additional content.";

    viewCreated.textContent = formatDate(note.createdAt);

    viewUpdated.textContent = formatDate(
        note.updatedAt || note.createdAt
    );

    // Open the dedicated read-only space
    viewDialog.showModal();
}


// CLOSE VIEW DIALOG
function closeViewDialog() {
    if (viewDialog.open) {
        viewDialog.close();
    }
}

closeViewButton.addEventListener(
    "click",
    closeViewDialog
);

viewDoneButton.addEventListener(
    "click",
    closeViewDialog
);

// Close view dialog by clicking outside it
viewDialog.addEventListener("click", event => {
    if (event.target === viewDialog) {
        closeViewDialog();
    }
});


// ====================================
// EDIT NOTE
// ====================================

// OPEN EDIT DIALOG
function openEditDialog(noteId) {
    const note = notes.find(item => item.id === noteId);

    if (!note) {
        showToast("Note not found.");
        return;
    }

    editingNoteId = note.id;

    editTitleInput.value = note.title;
    editContentInput.value = note.content || "";

    editDialog.showModal();
}


// CLOSE EDIT DIALOG
function closeEditDialog() {
    if (editDialog.open) {
        editDialog.close();
    }
}

editDialog.addEventListener("close", () => {
    editingNoteId = null;
    editForm.reset();
});

cancelEditButton.addEventListener(
    "click",
    closeEditDialog
);

cancelEditIcon.addEventListener(
    "click",
    closeEditDialog
);


// UPDATE NOTE
editForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!editingNoteId) {
        return;
    }

    const title = editTitleInput.value.trim();
    const content = editContentInput.value.trim();

    if (!title) {
        showToast("Title is required.");
        editTitleInput.focus();
        return;
    }

    const noteId = editingNoteId;

    updateButton.disabled = true;
    updateButton.textContent = "Updating...";

    try {
        const updatedNote = await apiRequest(
            `${API_URL}/${encodeURIComponent(noteId)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title,
                    content
                })
            }
        );

        notes = notes.map(note =>
            note.id === noteId ? updatedNote : note
        );

        closeEditDialog();

        renderNotes();

        showToast("Note updated successfully!");

    } catch (error) {
        console.error("Updating note failed:", error);
        showToast(error.message);

    } finally {
        updateButton.disabled = false;
        updateButton.textContent = "Save Changes";
    }
});


// ====================================
// DELETE NOTE
// ====================================

async function deleteNote(noteId, button) {
    const confirmed = confirm(
        "Are you sure you want to delete this note?"
    );

    if (!confirmed) {
        return;
    }

    button.disabled = true;
    button.textContent = "Deleting...";

    try {
        await apiRequest(
            `${API_URL}/${encodeURIComponent(noteId)}`,
            {
                method: "DELETE"
            }
        );

        notes = notes.filter(note => note.id !== noteId);

        renderNotes();

        showToast("Note deleted successfully!");

    } catch (error) {
        console.error("Deleting note failed:", error);

        showToast(error.message);

        button.disabled = false;
        button.textContent = "Delete";
    }
}


// ====================================
// NOTE CARD ACTIONS
// ====================================

notesGrid.addEventListener("click", event => {

    const button = event.target.closest(
        "button[data-action]"
    );

    if (!button) {
        return;
    }

    const action = button.dataset.action;
    const noteId = button.dataset.id;

    if (action === "view") {
        openViewDialog(noteId);
        return;
    }

    if (action === "edit") {
        openEditDialog(noteId);
        return;
    }

    if (action === "delete") {
        deleteNote(noteId, button);
    }
});


// SEARCH NOTES
searchInput.addEventListener(
    "input",
    renderNotes
);


// INITIALIZE APPLICATION
loadNotes();

console.log("Quick Note initialized successfully.");
