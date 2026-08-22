const fs = require('fs');
const path = require('path');

// Definice cesty ke složce se slovíčky (upravte podle toho, kde soubor spouštíte)
// Pokud je stahuj_vse.js v kořeni projektu (DeutschStudio), cesta je './data/slovicka'
const slovickaDir = path.join(__dirname, 'data/slovicka');

// ---------------------------------------------------------------------------
// 1. ZDE DOPLŇTE SVOU FUNKCI PRO STAHOVÁNÍ OBRÁZKŮ (např. pomocí fetch / axios)
// ---------------------------------------------------------------------------
async function downloadImage(keyword, targetFilePath, fileName) {
    // Příklad: sem přijde váš kód, který stáhne obrázek z nějaké služby (Google Images, Pixabay apod.)
    // a uloží ho jako soubor na disk do targetFilePath.
    console.log(`📥 Stahuji obrázek pro "${keyword}" -> ${fileName}`);
}

// ---------------------------------------------------------------------------
// 2. VAŠE FUNKCE PRO ZPRACOVÁNÍ JEDNÉ LEKCE
// ---------------------------------------------------------------------------
function processLessonFolder(lessonDirPath, jsonPath) {
    const relativePath = path.relative(slovickaDir, lessonDirPath);

    // Kontrola, zda soubor není prázdný (0 B)
    const stats = fs.statSync(jsonPath);
    if (stats.size === 0) {
        console.warn(`⚠️ Přeskakuji ${relativePath}: Soubor data.json je prázdný!`);
        return;
    }

    console.log(`\n📂 Zpracovávám lekci: ${relativePath}`);
    const imagesDir = path.join(lessonDirPath, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    try {
        const fileContent = fs.readFileSync(jsonPath, 'utf8').trim();
        if (!fileContent) {
            console.warn(`⚠️ Soubor data.json neobsahuje žádný text.`);
            return;
        }

        const data = JSON.parse(fileContent);
        const words = data.words || [];

        for (const word of words) {
            let fileName = null;
            if (typeof word.image === 'object' && word.image !== null) {
                if (word.image.available && word.image.file) {
                    fileName = word.image.file;
                }
            } else if (typeof word.image === 'string') {
                fileName = path.basename(word.image);
            }

            if (fileName && word.de) {
                const targetFilePath = path.join(imagesDir, fileName);

                if (!fs.existsSync(targetFilePath)) {
                    downloadImage(word.de, targetFilePath, fileName);
                } else {
                    console.log(`  ℹ️ Obrázek už existuje: ${fileName}`);
                }
            }
        }
    } catch (e) {
        console.error(`❌ Chyba při syntaxi JSONu v ${relativePath}:`, e.message);
    }
}

// ---------------------------------------------------------------------------
// 3. HLAVNÍ SPOUŠTĚČ (Tohle tomu chybělo, aby se skript rozběhl!)
// ---------------------------------------------------------------------------
function runAll() {
    if (!fs.existsSync(slovickaDir)) {
        console.error(`❌ Složka se slovíčky nebyla nalezena na cestě: ${slovickaDir}`);
        return;
    }

    // Projme složky učebnic (např. maximal1, atd.)
    const ucebniceDirs = fs.readdirSync(slovickaDir, { withFileTypes: true });

    ucebniceDirs.forEach(ucebniceDirent => {
        if (ucebniceDirent.isDirectory()) {
            const ucebnicePath = path.join(slovickaDir, ucebniceDirent.name);
            const lessonDirs = fs.readdirSync(ucebnicePath, { withFileTypes: true });

            lessonDirs.forEach(lessonDirent => {
                if (lessonDirent.isDirectory()) {
                    const lessonDirPath = path.join(ucebnicePath, lessonDirent.name);
                    const jsonPath = path.join(lessonDirPath, 'data.json');

                    if (fs.existsSync(jsonPath)) {
                        processLessonFolder(lessonDirPath, jsonPath);
                    }
                }
            });
        }
    });

    console.log("\n✨ Kontrola a stahování dokončeno.");
}

// Spuštění procesu
runAll();