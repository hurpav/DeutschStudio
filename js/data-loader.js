// Zobrazení chybové hlášky
function showError(msg) {
    const box = document.getElementById("json-status");
    box.textContent = msg;
    box.style.background = "#ffdddd";
    box.style.color = "#900";
    box.style.border = "1px solid #900";
    box.style.display = "block";
}

// Zobrazení úspěšné hlášky
function showSuccess(msg) {
    const box = document.getElementById("json-status");
    box.textContent = msg;
    box.style.background = "#ddffdd";
    box.style.color = "#060";
    box.style.border = "1px solid #060";
    box.style.display = "block";
}

// Načtení seznamu lekcí
export async function loadLessonList() {
    const response = await fetch("../data/slovicka/vlastní/lekce.json");

    if (!response.ok) {
        showError("❌ Nelze načíst seznam lekcí");
        throw new Error("Nelze načíst lekce.json");
    }

    showSuccess("✔ Seznam lekcí načten");
    return await response.json();
}

// Načtení konkrétní lekce
export async function loadLessonData(lesson) {
    const fullPath = `../data/slovicka/${lesson.ucebnice}/${lesson.file}`;

    const response = await fetch(fullPath);

    if (!response.ok) {
        showError(`❌ JSON se nepodařilo načíst: ${fullPath}`);
        return { words: [] };
    }

    showSuccess(`✔ JSON načten: ${fullPath}`);
    return await response.json();
}
