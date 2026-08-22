// Načtení seznamu lekcí
export async function loadLessonList() {
    const response = await fetch("../data/lekce.json");

    if (!response.ok) {
        throw new Error(
            `Nelze načíst seznam lekcí (${response.status})`
        );
    }

    return await response.json();
}


// Načtení konkrétní lekce
export async function loadLessonData(lesson) {

    const fullPath =
        `../data/slovicka/${lesson.ucebnice}/${lesson.folder}/data.json`;

    console.log("DeutschStudio – načítám:", fullPath);

    const response = await fetch(fullPath);

    if (!response.ok) {
        throw new Error(
            `Nelze načíst slovíčka: ${fullPath} (${response.status})`
        );
    }

    const data = await response.json();

    console.log("DeutschStudio – načtená data:", data);

    return data;
}