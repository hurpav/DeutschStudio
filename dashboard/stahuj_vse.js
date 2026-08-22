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

        words.forEach(word => {
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
        });
    } catch (e) {
        console.error(`❌ Chyba při syntaxi JSONu v ${relativePath}:`, e.message);
    }
}