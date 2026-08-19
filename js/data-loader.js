// Načtení seznamu lekcí
export async function loadLessonList() {
    const response = await fetch("../data/slovicka/vlastní/lekce.json");
    if (!response.ok) throw new Error("Nelze načíst lekce.json");
    return await response.json();
}

// Načtení konkrétní lekce
export async function loadLessonData(lesson) {
    // Dynamická cesta podle učebnice
    const fullPath = `../data/slovicka/${lesson.ucebnice}/${lesson.file}`;

    const response = await fetch(fullPath);
    if (!response.ok) throw new Error(`Nelze načíst ${fullPath}`);
    return await response.json();
}
