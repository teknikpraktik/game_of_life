# Game of Life Lab

En liten statisk webbapp för att utforska Conway's Game of Life och sambandet mellan enkla regler, emergens och beräkning.

## Funktioner

- Rita egna startmönster genom att klicka eller dra.
- Starta/pausa, stega generation för generation, slumpa och rensa.
- Justerbar simuleringshastighet.
- Förinställda mönster: Glider, Blinker, Pulsar och Gosper glider gun.
- Svensk pedagogisk förklaring av hur mönster kan fungera som signaler och byggstenar för logik.
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

## Bra nästa steg i Claude Code

Be Claude Code bygga en separat vy kallad "Från glider till logik" där två ingångar A och B kan aktiveras och där appen pedagogiskt visar hur glider-kollisioner kan representera logiska operationer. Prioritera begriplighet framför att göra en fullständig Life-baserad CPU.
