import { loadLessonList, loadLessonData } from "./data-loader.js";

const bookSelect = document.getElementById("book-select");
const lessonSelect = document.getElementById("lesson-select");

const lessonTitle = document.getElementById("lesson-title");
const wordCount = document.getElementById("word-count");
const totalWordsStat = document.getElementById("total-words");

let lessons = [];
let currentLesson = null;

// Status box
function showStatus(msg, ok = true) {
    let box = document.getElementById("json-status");
    if (!box) {
        box = document.createElement("div");
        box.id = "json-status";
        box.style.padding = "10px";
        box.style.marginTop = "10px";
        box.style.borderRadius = "6px";
        document.querySelector(".ds-panel").appendChild(box);
    }

    box.textContent = msg;
    box.style.display = "block";
    box.style.background = ok ? "#ddffdd" : "#ffdddd";
    box.style.color = ok ? "#060" : "#900";
    box.style.border = ok ? "1px solid #060" : "1px solid #900";
}

// Naplnění učebnic
function populateBooks() {
    const books = [...new Set(lessons.map(l => l.ucebnice))];
    bookSelect.innerHTML = "";

    books.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b;
        opt.textContent = b;
        bookSelect.appendChild(opt);
    });

    updateLessonSelect();
}

// Naplnění lekcí podle učebnice
function updateLessonSelect() {
    const selectedBook = bookSelect.value;

    const filtered = lessons.filter(
        l => l.ucebnice === selectedBook
    );

    lessonSelect.innerHTML = "";
    filtered.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l.id;
        opt.textContent = `${l.id} – ${l.title}`;
        lessonSelect.appendChild(opt);
    });

    if (filtered.length > 0) {
        currentLesson = filtered[0];
        loadLesson();
    }
}

// Načtení slovíček
async function loadLesson() {
    const selectedId = lessonSelect.value;
    currentLesson = lessons.find(l => l.id === selectedId);

    const data = await loadLessonData(currentLesson);

    if (!data.words || data.words.length === 0) {
        showStatus(`❌ JSON se nepodařilo načíst nebo je prázdný`, false);
    } else {
        showStatus(`✔ JSON načten: ${currentLesson.file}`, true);
    }

    lessonTitle.textContent = `${currentLesson.id} – ${currentLesson.title}`;
    wordCount.textContent = data.words.length;
    totalWordsStat.textContent = data.words.length;
}

// Události
bookSelect.addEventListener("change", updateLessonSelect);
lessonSelect.addEventListener("change", loadLesson);

// Start
(async () => {
    lessons = await loadLessonList();
    populateBooks();
})();
