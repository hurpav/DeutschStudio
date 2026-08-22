// Aktualizace titulku a počtu slov
export function updateDashboard(lesson, data) {
    const lessonTitle = document.getElementById("lesson-title");
    const wordCount = document.getElementById("word-count");
    const totalWordsStat = document.getElementById("total-words");

    lessonTitle.textContent = `${lesson.id} – ${data.title}`;
    wordCount.textContent = data.words.length;
    totalWordsStat.textContent = data.words.length;
}

// Zobrazení slovíček
export function renderVocabulary(words) {
    let vocabSection = document.getElementById("vocabulary-preview");

    if (!vocabSection) {
        vocabSection = document.createElement("section");
        vocabSection.id = "vocabulary-preview";
        vocabSection.className = "panel";

        const statsSection = document.querySelector(".statistics");
        statsSection.parentNode.insertBefore(vocabSection, statsSection);
    }

    let html = `<h2>📚 Slovní zásoba (${words.length})</h2>`;

    if (words.length === 0) {
        html += `<p>Žádná slovíčka.</p>`;
    } else {
        html += `<div class="vocab-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px;">`;

        words.forEach(word => {
            let genderClass = "neutral";
            const deLower = word.de.toLowerCase();
            if (deLower.startsWith("der ")) genderClass = "masculine";
            else if (deLower.startsWith("die ")) genderClass = "feminine";
            else if (deLower.startsWith("das ")) genderClass = "neuter";

            html += `
                <div class="vocab-card ${genderClass}" style="padding: 12px; border-radius: 8px; background: #f9f9f9;">
                    <div style="font-weight: bold;">${word.de}</div>
                    <div style="color: #666;">${word.cz}</div>
                </div>
            `;
        });

        html += `</div>`;
    }

    vocabSection.innerHTML = html;
}
