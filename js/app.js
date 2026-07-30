fetch("data/lekce.json")
  .then(response => response.json())
  .then(lekce => {

    console.log("Lekce:", lekce);

    const soubor = lekce[0].file;

    return fetch(soubor);

  })
  .then(response => response.json())
  .then(data => {

    console.log("Načtená slovní zásoba:", data);

    console.log(
      "Počet slov:",
      data.words.length
    );

  })
  .catch(error => {
    console.error("Chyba načítání:", error);
  });