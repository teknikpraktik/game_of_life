# Game of Life Lab

En liten statisk webbapp för att utforska Conway's Game of Life och sambandet mellan enkla regler, emergens och beräkning.

## Funktioner

- Rita egna startmönster genom att klicka eller dra.
- Starta/pausa, stega generation för generation, slumpa och rensa.
- Justerbar simuleringshastighet.
- Förinställda mönster: Glider, Blinker, Pulsar, Gosper glider gun och Eater.
- Zoom (knappar, Ctrl + scroll, nypning med två fingrar) och panorering för större konstruktioner.
- Svensk pedagogisk förklaring av hur mönster kan fungera som signaler och byggstenar för logik.
- Vyn **Från glider till logik** (`index.html#logik`) i sex steg:
  1. En glider som signal från sändare till mottagare.
  2. Två gliders som kolliderar – exakt timing (båda förintas) jämfört med en ruta fel (skräp).
  3. Ingång A och ingång B.
  4. Glider = 1, ingen glider = 0: ett fyrbitarstal som glidertåg med tidsfönster.
  5. Logiska grindar NOT, AND, OR och NOR byggda av glider-kollisioner, med sanningstabell som körs i simuleringen.
  6. Schematisk förklaring av hur grindar blir minne (SR-vippa), räknare och dator.
- Ingen backend, databas eller dependency-installation krävs.

## Köra lokalt

Öppna `index.html` direkt i webbläsaren, eller kör exempelvis:

```bash
python -m http.server 8000
```

och gå till `http://localhost:8000`.

## GitHub

```bash
git init
git add .
git commit -m "Initial Game of Life Lab"
git branch -M main
git remote add origin <DIN-GITHUB-REPO-URL>
git push -u origin main
```

## Vercel

Importera GitHub-repot i Vercel. Vercel kan deploya det som en statisk webbplats direkt. Inga miljövariabler behövs.

## Hur grindarna fungerar

Steg 1–5 är riktig Game of Life med oförändrade regler. Banor, mottagare och etiketter är bara markeringar ovanpå rutnätet. All logik kommer från startmönstret:

- **Förintande kollision.** När en sydostgående glider har sin 3×3-ruta på (r, c) och en sydvästgående glider samtidigt har sin på (r − 1, c + 6) försvinner båda helt. Speglat gäller samma sak för en nordostgående glider på (r + 6, c − 1). Positionen togs fram med en uttömmande sökning över relativa lägen och faser.
- **Klockglider.** En glider C som alltid finns (logisk 1). En indataglider som förintar C ger ut `C OCH INTE A`, alltså NOT. Två korsningar i rad ger NOR. AND och OR byggs på samma sätt (se kommentarerna i `gateScene` i `app.js`).
- **Eater.** Varje utgående bana slutar i en eater 1 som slukar glidern, så att inget skräp uppstår vid kanten.
- **Mottagare.** En träff registreras när en hel glider (5 celler) ligger inom mottagarens 5×5-ruta.

Förenkling: varje klocksignal är en enda glider (en tidslucka). Fullskaliga konstruktioner använder glidervapen som klocka och reflektorer för att svänga signaler.
