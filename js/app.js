console.log("DeutschStudio Dashboard inicializován.");

// Elementy z HTML
const bookSelect = document.getElementById("book-select");
const lessonSelect = document.getElementById("lesson-select");
const classSelect = document.getElementById("class-select");

const lessonTitle = document.getElementById("lesson-title");
const wordCount = document.getElementById("word-count");
const totalWordsStat = document.getElementById("total-words");
const lessonNumberStat = document.getElementById("lesson-number");

// Globální proměnné pro stav
let availableLessons = [];
let currentWords = [];

// 1. Načtení seznamu lekcí
fetch("data/lekce.json")
    .then(response => {
        if (!response.ok) throw new Error("Nelze načíst data/lekce.json");
        return response.json();
    })
    .then(lessons => {
        availableLessons = lessons;

        if (lessonNumberStat) {
            lessonNumberStat.textContent = lessons.length;
        }

        populateLessonSelect(lessons);

        if (lessons.length > 0) {
            loadLessonData(lessons[0]);
        }
    })
    .catch(error => {
        console.error("Chyba při načítání seznamu lekcí:", error);
    });

// 2. Naplnění selectu lekcemi
function populateLessonSelect(lessons) {
    lessonSelect.innerHTML = "";

    lessons.forEach((lesson, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${lesson.id || ''} ${lesson.title || 'Lekce'}`.trim();
        lessonSelect.appendChild(option);
    });
}

// 3. Změna lekce
lessonSelect.addEventListener("change", (e) => {
    const selectedIndex = e.target.value;
    const selectedLesson = availableLessons[selectedIndex];
    if (selectedLesson) {
        loadLessonData(selectedLesson);
    }
});

// 4. Načtení JSON souboru lekce
function loadLessonData(lesson) {
    fetch(lesson.file)
        .then(response => {
            if (!response.ok) throw new Error(`Nelze načíst ${lesson.file}`);
            return response.json();
        })
        .then(data => {
            currentWords = Array.isArray(data.words) ? data.words : [];

            lessonTitle.textContent = `${lesson.id ? lesson.id + ' - ' : ''}${data.title || lesson.title}`;
            wordCount.textContent = currentWords.length;

            if (totalWordsStat) {
                totalWordsStat.textContent = currentWords.length;
            }

            console.log(`Lekce "${data.title || lesson.title}" načtena. Počet slov: ${currentWords.length}`);

            renderVocabularyPreview(currentWords);
        })
        .catch(error => {
            console.error("Chyba při načítání dat lekce:", error);
            lessonTitle.textContent = "Chyba při načítání lekce";
            wordCount.textContent = "0";
        });
}

// 5. Zobrazení slovíček
function renderVocabularyPreview(words) {
    let vocabSection = document.getElementById("vocabulary-preview");

    if (!vocabSection) {
        vocabSection = document.createElement("section");
        vocabSection.id = "vocabulary-preview";
        vocabSection.className = "panel";

        const statsSection = document.querySelector(".statistics");
        if (statsSection) {
            statsSection.parentNode.insertBefore(vocabSection, statsSection);
        } else {
            document.querySelector(".dashboard").appendChild(vocabSection);
        }
    }

    let html = `<h2>📚 Slovní zásoba lekce (${words.length})</h2>`;

    if (words.length === 0) {
        html += `<p>V této lekci zatím nejsou žádná slovíčka.</p>`;
    } else {
        html += `<div class="vocab-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-top: 15px;">`;

        words.forEach(word => {
            let genderClass = "neutral";
            const deLower = word.de.toLowerCase();
            if (deLower.startsWith("der ")) genderClass = "masculine";
            else if (deLower.startsWith("die ")) genderClass = "feminine";
            else if (deLower.startsWith("das ")) genderClass = "neuter";

            html += `
                <div class="vocab-card ${genderClass}" style="padding: 12px; border: 1px solid #ccc; border-radius: 8px; background: #f9f9f9;">
                    <div style="font-weight: bold; font-size: 1.1em;">${word.de}</div>
                    <div style="color: #666; font-size: 0.95em;">${word.cz}</div>
                </div>
            `;
        });

        html += `</div>`;
    }

    vocabSection.innerHTML = html;
}

/* -------------------------------------------------------
   FUNKCE PRO MODULY – MUSÍ BÝT MIMO renderVocabularyPreview
------------------------------------------------------- */

function getSelectedLessonFile() {
    const selectedIndex = lessonSelect.value;
    const lesson = availableLessons[selectedIndex];
    return lesson.file;
}

function openPictureDictionary() {
    const file = getSelectedLessonFile();
    window.location.href = `modules/bildwoerterbuch/index.html?file=${file}`;
}

function openDomino() {
    const file = getSelectedLessonFile();
    window.location.href = `modules/domino/index.html?file=${file}`;
}

function openTrimino() {
    const file = getSelectedLessonFile();
    window.location.href = `modules/trimino/index.html?file=${file}`;
}

function openSchiffe() {
    const file = getSelectedLessonFile();
    window.location.href = `modules/schiffe/index.html?file=${file}`;
}

function openRiskuj() {
    const file = getSelectedLessonFile();
    window.location.href = `modules/riskuj/index.html?file=${file}`;
}

function openFlashcards() {
    const file = getSelectedLessonFile();
    window.location.href = `modules/flashcards/index.html?file=${file}`;
}

function openTest() {
    const file = getSelectedLessonFile();
    window.location.href = `modules/test/index.html?file=${file}`;
}
