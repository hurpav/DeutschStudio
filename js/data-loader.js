// Načtení seznamu lekcí
export async function loadLessonList() {
    const response = await fetch("data/lekce.json");
    if (!response.ok) throw new Error("Nelze načíst data/lekce.json");
    return await response.json();
}

// Načtení konkrétní lekce
export async function loadLessonData(lesson) {
    const response = await fetch(lesson.file);
    if (!response.ok) throw new Error(`Nelze načíst ${lesson.file}`);
    return await response.json();
}
