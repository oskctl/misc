# Markle

A daily guessing game about concrete architecture, made for Mark. One building a day, drawn
rather than photographed: name it in six guesses, then complete the drawing's title block.

- **The main round**: the drawing starts as a silhouette and gains a layer with every wrong guess.
  Each guess shows the distance, direction and closeness to the answer, plus whether its era,
  architect and type match.
- **The title block**: five quick rounds after the main guess: architect, completion year, one
  dimension, how the concrete was made, and two truths and a lie.
- **Sharing**: a spoiler-free result in Worldle's grammar, copied to the clipboard. Stats and
  streaks live in each player's browser.

The full design, with the Worldle research behind it, is in [`docs/DESIGN.md`](docs/DESIGN.md).

## Run it

```bash
cd markle
npm install          # dev tools only: esbuild, the map data, a headless renderer
npm run serve        # then open http://localhost:8765
npm test             # unit tests for the game logic
npm run build        # dist/markle.html (any static host) and dist/artifact.html (claude.ai)
```

The game itself has no runtime dependencies. `index.html` loads the ES modules in `src/` directly,
so serve the folder over HTTP rather than opening the file.

## Host it

- **One file**: `npm run build`, then upload `dist/markle.html` as `index.html` anywhere static.
- **GitHub Pages**: `.github/workflows/markle.yml` tests and builds on every push and deploys from
  the default branch. Turn it on once under Settings → Pages → Source: GitHub Actions.
- **claude.ai Artifact**: publish `dist/artifact.html`.

Set `shareUrl` in `data/config.js` to the address you share, so results link back to the game.

## Add a sheet

1. Draw `drawings/NNN.svg` to the spec in [`docs/DRAWINGS.md`](docs/DRAWINGS.md). Check every
   stage with `node tools/render-drawing.mjs drawings/NNN.svg out.png`.
2. Add the building to `data/buildings.js` if it is not in the guess pool.
3. Append an entry to `data/puzzles.js` (see the existing ones for the fields).
4. `npm run build` packs the drawing and rebuilds.

Sheet *n* is issued at local midnight on `startDate + (n − 1)` days (`data/config.js`). Open the
game with `#preview` to play unissued sheets; those results are kept apart.

## Files

| Path | What it is |
|---|---|
| `index.html`, `styles/` | the page and its two stylesheets (UI, drawing vocabulary) |
| `src/` | game modules: rules (`game.js`, `rounds.js`), maths (`geo.js`, `daily.js`), `stats.js`, `share.js`, `search.js`, UI (`app.js`, `sheet.js`, `bonus.js`, `panels.js`, `keyplan.js`) |
| `data/` | config, puzzles, the guess pool, the concrete-technique vocabulary, the packed drawings, the world map |
| `drawings/` | one layered SVG per sheet |
| `tools/` | build, drawing renderer, map generator |
| `tests/` | `node --test` unit tests |
