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
const lessonNumberStat = document.getElementById("lesson-number");

let lessons = [];
let currentLesson = null;
let currentWords = [];

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
        const panel = document.querySelector(".ds-panel");
        if (panel) panel.appendChild(box);
    }
    if (!box) return;

    box.textContent = msg;
    box.style.display = "block";
    box.style.background = ok ? "#ddffdd" : "#ffdddd";
    box.style.color = ok ? "#060" : "#900";
    box.style.border = ok ? "1px solid #060" : "1px solid #900";
}

/* -------------------------------------------------------
   BARVY PODLE ČLENŮ (Jednotný design DeutschStudio)
------------------------------------------------------- */
function getGenderClass(article) {
    if (!article) return "neutral";
    const art = article.toLowerCase().trim();
    if (art === "der") return "masculine";
    if (art === "die") return "feminine";
    if (art === "das") return "neuter";
    return "neutral";
}

/* -------------------------------------------------------
   UČEBNICE
------------------------------------------------------- */
function populateBooks() {
    if (!bookSelect) return;
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
    if (!bookSelect || !lessonSelect) return;
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
   NAČTENÍ JSON SLOVÍČEK A ŽIVÝ NÁHLED
------------------------------------------------------- */
async function loadLesson() {
    if (!lessonSelect) return;
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
        currentWords = data.words || [];

        if (currentWords.length === 0) {
            showStatus("❌ JSON se nepodařilo načíst nebo je prázdný", false);
        } else {
            showStatus(`✔ JSON načten: ${currentLesson.folder}/data.json`, true);
        }

        if (lessonTitle) lessonTitle.textContent = `${currentLesson.id} – ${currentLesson.title}`;
        if (wordCount) wordCount.textContent = currentWords.length;
        if (totalWordsStat) totalWordsStat.textContent = currentWords.length;

        // Vykreslení přehledu slovíček přímo na dashboardu
        renderVocabularyPreview(currentWords);

    } catch (e) {
        console.error(e);
        showStatus("❌ Chyba při načítání JSON souboru", false);
        currentWords = [];
        renderVocabularyPreview([]);
    }
}

/* -------------------------------------------------------
   ŽIVÝ NÁHLED SLOVÍČEK NA DASHBOARDU
------------------------------------------------------- */
function renderVocabularyPreview(words) {
    let vocabSection = document.getElementById("vocabulary-preview");
    
    if (!vocabSection) {
        vocabSection = document.createElement("section");
        vocabSection.id = "vocabulary-preview";
        vocabSection.className = "ds-panel";
        vocabSection.style.marginTop = "20px";
        
        const mainElement = document.querySelector("main") || document.body;
        mainElement.appendChild(vocabSection);
    }

    let html = `<h2 class="ds-title">📚 Slovní zásoba lekce (${words.length})</h2>`;
    
    if (words.length === 0) {
        html += `<p style="color: #64748b;">V této lekci zatím nejsou žádná slovíčka.</p>`;
    } else {
        html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-top: 15px;">`;
        
        words.forEach(word => {
            const gender = getGenderClass(word.artikel);
            let borderColor = "#cbd5e1";
            let badgeBg = "#f1f5f9";
            
            if (gender === "masculine") { borderColor = "#1e40af"; badgeBg = "#eff6ff"; }
            else if (gender === "feminine") { borderColor = "#dc2626"; badgeBg = "#fef2f2"; }
            else if (gender === "neuter") { borderColor = "#059669"; badgeBg = "#ecfdf5"; }

            html += `
                <div style="padding: 12px; border: 1px solid #cbd5e1; border-left: 5px solid ${borderColor}; border-radius: 8px; background: ${badgeBg};">
                    <div style="font-weight: 700; font-size: 1.05rem; color: #0f172a;">
                        <span style="font-size: 0.85rem; color: #64748b; font-weight: normal;">${word.artikel || ''}</span> ${word.de}
                    </div>
                    <div style="color: #475569; font-size: 0.9rem; margin-top: 2px;">${word.cz}</div>
                </div>
            `;
        });
        
        html += `</div>`;
    }

    vocabSection.innerHTML = html;
}

/* -------------------------------------------------------
   UDÁLOSTI
------------------------------------------------------- */
if (bookSelect) bookSelect.addEventListener("change", updateLessonSelect);
if (lessonSelect) lessonSelect.addEventListener("change", loadLesson);

/* -------------------------------------------------------
   START NAČTENÍ REJSTŘÍKU LEKCÍ
------------------------------------------------------- */
(async () => {
    try {
        const response = await fetch(`${BASE_URL}/data/lekce.json`);
        lessons = await response.json();
        
        if (lessonNumberStat) {
            lessonNumberStat.textContent = lessons.length;
        }

        populateBooks();
    } catch (e) {
        console.error(e);
        showStatus("❌ Nelze načíst lekce.json", false);
    }
})();

/* -------------------------------------------------------
   OTEVÍRÁNÍ MODULŮ S PARAMETRY
------------------------------------------------------- */
function openModule(path) {
    if (!currentLesson) {
        alert("Lekce není načtena.");
        return;
    }

    window.location.href = 
        `${BASE_URL}${path}?ucebnice=${currentLesson.ucebnice}&folder=${currentLesson.folder}`;
}

// Globální funkce pro spouštění modulů z dashboardu
window.openPictureDictionary = () => openModule("/modules/bildwoerterbuch/bildwoerterbuch.html");
window.openDomino = () => openModule("/modules/domino/domino.html");
window.openTrimino = () => openModule("/modules/trimino/trimino.html");
window.openWheel = () => openModule("/modules/wheel/index.html");
window.openSchiffe = () => openModule("/modules/schiffe/schiffe.html");
window.openRiskuj = () => openModule("/modules/riskuj/riskuj.html");
window.openFlashcards = () => openModule("/modules/flashcards/flashcards.html");
window.openTest = () => openModule("/modules/test/test.html");
