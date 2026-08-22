console.log("DeutschStudio Dashboard inicializován.");

// Automatická detekce prostředí (GitHub Pages vs. lokální vývoj)
const isGitHub = window.location.hostname.includes("github.io");
const BASE_URL = isGitHub ? "/DeutschStudio" : "";

// HTML elementy
const bookSelect = document.getElementById("book-select");
const lessonSelect = document.getElementById("lesson-select");

const lessonTitle = document.getElementById("lesson-title");
const wordCount = document.getElementById("word-count");
const totalWordsStat = document.getElementById("total-words");

let lessons = [];
let currentLesson = null;

/* -------------------------------------------------------
   STATUS BOX
------------------------------------------------------- */
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

/* -------------------------------------------------------
   UČEBNICE
------------------------------------------------------- */
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

/* -------------------------------------------------------
   LEKCE PODLE UČEBNICE
------------------------------------------------------- */
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

/* -------------------------------------------------------
   NAČTENÍ JSON SLOVÍČEK
------------------------------------------------------- */
async function loadLesson() {
    const selectedId = lessonSelect.value;
    currentLesson = lessons.find(l => l.id === selectedId);

    if (!currentLesson) {
        showStatus("❌ Lekce nebyla nalezena", false);
        return;
    }

    const fullPath = `${BASE_URL}/data/slovicka/${currentLesson.ucebnice}/${currentLesson.folder}/data.json`;

    try {
        const response = await fetch(fullPath);
        if (!response.ok) throw new Error("JSON nenalezen");

        const data = await response.json();

        if (!data.words || data.words.length === 0) {
            showStatus(`❌ JSON se nepodařilo načíst nebo je prázdný`, false);
        } else {
            showStatus(`✔ JSON načten: ${currentLesson.folder}/data.json`, true);
        }

        lessonTitle.textContent = `${currentLesson.id} – ${currentLesson.title}`;
        wordCount.textContent = data.words.length;
        totalWordsStat.textContent = data.words.length;

    } catch (e) {
        console.error(e);
        showStatus("❌ Chyba při načítání JSON souboru", false);
    }
}

/* -------------------------------------------------------
   UDÁLOSTI
------------------------------------------------------- */
bookSelect.addEventListener("change", updateLessonSelect);
lessonSelect.addEventListener("change", loadLesson);

/* -------------------------------------------------------
   START
------------------------------------------------------- */
(async () => {
    try {
        const response = await fetch(`${BASE_URL}/data/lekce.json`);
        lessons = await response.json();
        populateBooks();
    } catch (e) {
        console.error(e);
        showStatus("❌ Nelze načíst lekce.json", false);
    }
})();

/* -------------------------------------------------------
   OTEVÍRÁNÍ MODULŮ
------------------------------------------------------- */
function openModule(path) {
    if (!currentLesson) {
        alert("Lekce není načtena.");
        return;
    }

    window.location.href =
        `${BASE_URL}${path}?ucebnice=${currentLesson.ucebnice}&folder=${currentLesson.folder}`;
}

window.openPictureDictionary = () => openModule("/modules/bildwoerterbuch/index.html");
window.openDomino = () => openModule("/modules/domino/index.html");
window.openTrimino = () => openModule("/modules/trimino/index.html");
window.openSchiffe = () => openModule("/modules/schiffe/index.html");
window.openRiskuj = () => openModule("/modules/riskuj/index.html");
window.openFlashcards = () => openModule("/modules/flashcards/index.html");
window.openTest = () => openModule("/modules/test/index.html");