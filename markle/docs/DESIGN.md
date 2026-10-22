# Markle: game design

One concrete building a day, drawn rather than photographed. Name it in six guesses, then
complete the drawing's title block.

This document records what the game is, why it works the way it does, and how the content is
made. The research behind it (a Worldle teardown, a shortlist of 33 candidate buildings, a naming
study, three competing design proposals and two critiques) is summarised in section 9.

---

## 1. The answer to "silhouette or close-up, and what do you guess?"

- **You guess the building**, picked by name from a list of about 270 notable concrete
  buildings worldwide.
- **The clue is a drawing that starts as a silhouette.** That is Worldle's first glance. A
  building outline is less distinctive than a coastline, so each wrong guess issues a revision of
  the drawing with more detail (borrowed from Framed).
- **Location steers you**, exactly as in Worldle: every wrong guess shows the distance and
  direction from your guess to the answer.
- **Architect, date and the rest are the follow-up questions** ("complete the title block").
- **The tight close-up idea is a mode.** Close-up mode starts zoomed into a detail at 1:20 and
  steps out one drawing scale per miss.

Why drawings and not photos: they are consistent from day to day, they are copyright-clean, they
read the way architects read buildings (elevation, scale, title block), and they can be built in
layers, which is what makes a progressive reveal possible. The build environment also cannot fetch
photographs. Photos could be added later as a reveal-screen extra.

## 2. The main round

| | |
|---|---|
| Guesses | 6 |
| Input | Type a building, city or country; pick from the list. Architect names never match (knowing who designed it is part of the test). The list shows name, city and country, never architect, year or a picture. |
| Feedback | Distance (km or miles), an arrow rotated to the exact bearing, proximity out of 100. Each row also names the guessed building's city and country. Nothing about the answer's age, architect or size. |
| Reveal ladder | Rev 0 silhouette → A structure + 1.75 m figure → B openings + TYPE hint → C surface → D context + COUNTRY hint → E CITY hint. The scale bar appears only once the Dimension round is settled. |
| End | Win: the sheet is stamped APPROVED. Loss: SUPERSEDED, and the answer is shown. Either way the title-block round opens. |

**Why only one feedback channel.** The main round must not answer the title block. An earlier
build added YEAR, ARCH and TYPE chips to every guess (the way Poeltl's attribute grid does), but
after a few guesses the ▲/▼ year marks had narrowed the completion year, and a lit ARCH chip had
given away the architect, before either question was asked. Distance, direction and proximity say
where the building is and nothing else. For the same reason architect names never match in the
guess list, and the scale bar stays off the sheet until the Dimension round is done; the 1.75 m
figure is the only measure before then. Close calls between buildings in one city are carried by
the log-scale proximity below and by the drawing itself.

**Why log-scale proximity.** Worldle scores proximity linearly over 20,000 km, so any guess on the
right continent reads 90%+. Markle uses `100 × (1 − ln(1 + d/10 km) / ln 2001)`: every 10× closer
adds about 30 points (10 km = 91, 100 km = 68, 1,000 km = 39, 10,000 km = 9). The share grid then
tells a story: wrong continent → right country → right city → solved. 100 is reserved for the
answer itself.

## 3. Complete the title block (bonus rounds)

Five quick rounds after the main guess, win or lose, each filling a field on the drawing's title
block. Fixed order, option order seeded by sheet number so friends see the same layout.

| Field | Prompt | Options | Tries |
|---|---|---|---|
| ✏️ Architect | Who designed it? | 4 names | 1 |
| 📅 Year | When was it finished? | 4 years, 10 years apart | 1 |
| 📏 Size | How big is it? | 4 sizes ×2 apart; the drawing with a "?" dimension line and the 1.75 m figure, no scale bar | 1 |
| 🏗️ Concrete | How was the concrete made? | 4 techniques from a shared vocabulary | 1 |
| 📜 Lie | Which one is false? | 3 statements, one false | 1 |

Every bonus question is one pick from four options (three for the lie), like Worldle's follow-up rounds.

Design rules that keep this honest: the ±2-year tolerance absorbs source disagreements about
completion; the ×2 spacing means a 10% disagreement about a dimension can never flip the answer;
the lie is always a falsified version of a verified fact, never an invention that might
accidentally be true.

## 4. Sharing, stats, the daily clock

**Share text** (Worldle's grammar, spoiler-free):

```
#Markle 003 · 3/6
🟨⬜⬜⬜⬜↗️
🟩🟩🟩🟩🟨⬅️
🟩🟩🟩🟩🟩📐
✏️📅⬜🏗️📜 4/5
🔥 4-day streak
https://…
```

Each row is five proximity squares (🟩 per 20 points, 🟨 for 10 more) and the arrow from that
guess towards the answer (📍 next door, 📐 solved). A loss reads `X/6 (best%)`; close-up mode
adds `*`. High-contrast setting swaps 🟩🟨 for 🟧🟦. Copy uses the clipboard API, then a hidden
textarea, then selects the text for the player.

**Stats** live in the browser (like Worldle and Wordle) and are recomputed from per-sheet records
every time, never stored as counters. Played, win %, current and best streak, the 1–6/X
distribution, and pass rates per title-block field. A streak counts sheets won on the day they
were issued (a sheet started on its day may finish the day after, so midnight doesn't break a
game in progress), by consecutive sheet number. There is no archive of past sheets: a browsable
list of drawings gave the upcoming puzzles away. Settings has a copy/paste stats code to move devices.

**The clock.** Sheet *n* is issued at local midnight on `startDate + (n − 1)` days (set in
`data/config.js`). With `startDate` four days before launch, all five launch sheets are open on
day one and sheet 005 is "today". When the data runs out, the game says the next sheet is "on the
drawing board" instead of breaking. `#preview` opens unissued sheets for checking; results there
are kept apart.

## 5. Look and feel

**Direction: the drawing sheet.** Concrete-grey paper, ink linework, hairline rules, square
corners, no shadows or gradients. One accent: the reviewer's red pen (redline) for stamps, struck
answers, the active revision and focus. Type is Archivo (expanded, heavy, for the wordmark and the
answer) with IBM Plex Mono for every label and number, the way a title block is lettered. The
wordmark stands on a heavy rule like a building on its ground line.

**Mobile first.** Designed at 390 px. The guess box sits at the bottom within thumb reach and its
suggestions open upwards, so the keyboard never hides them; it stays above the iOS keyboard via
the visual viewport. Panels are bottom sheets. All targets are at least 44 px; bonus rounds need
no typing. Light and dark themes follow the system or a setting.

## 6. Content

**Launch lineup** (easiest to hardest; three from 1989 onwards, four continents):

| No. | Building | Architect | Year | Country | View |
|---|---|---|---|---|---|
| 001 | Niterói Contemporary Art Museum | Oscar Niemeyer | 1996 | Brazil | Elevation |
| 002 | Trellick Tower | Ernő Goldfinger | 1972 | UK | Elevation |
| 003 | Geisel Library | William L. Pereira | 1970 | USA | Elevation |
| 004 | Bruder Klaus Field Chapel | Peter Zumthor | 2007 | Germany | Elevation |
| 005 | Church of the Light | Tadao Ando | 1989 | Japan | Section |

Considered and held back: Álvaro Siza's Portugal Pavilion (portico dimensions could not be
verified) and the Ministry of Highways, Tbilisi (the bar arrangement could not be verified). For
an architect audience a wrong silhouette is the worst failure, so unverifiable geometry is out.

**Guess pool.** About 270 buildings in 50 countries: classic Brutalism, béton brut, expressive
shells and contemporary concrete, including demolished icons. Coordinates are of the building
itself.

**Authoring a sheet.** One SVG drawing (spec: [`DRAWINGS.md`](DRAWINGS.md)) plus one entry in
`data/puzzles.js`: answer id, view, scale (`pxPerM`), type label, construction range, credits,
a 60–90 word "why it matters", the five title-block questions with sources, and a list of any
estimated drawing elements. Each launch sheet went through research, drawing with rendered
self-review, writing, an adversarial fact and drawing check, and fixes.

## 7. Name

**Markle**: Mark's name, and the marks timber formwork leaves in board-marked concrete, and the
mark-up architects use on each other's drawings. It is three letters from Wordle (the one-letter
pun is where the NYT objected to Worldle), and since it travels by link, sharing a name with a
famous surname does not matter. Runner-up: **Brutle** (sounds exactly like "brutal"), rejected
because it covers Brutalism but not contemporary concrete.

## 8. Hosting

A static site with no backend. `node tools/build.mjs` bundles everything into one HTML file:
`dist/markle.html` for any static host (GitHub Pages, Netlify drop) and `dist/artifact.html` for
a claude.ai Artifact. Stats stay in each player's browser.

## 9. Research summary

**Worldle, in brief.** Six guesses at a country silhouette, distance plus an 8-way arrow plus a
linear proximity %. After a win, up to seven optional bonus rounds (neighbours, capital, flag,
languages, population and currency, cities, area), each adding an emoji to the share line. Local
midnight reset, stats in the browser, streak in the share text since 2026, archive and sync behind
a paid tier. Players love the shared daily puzzle, the spoiler-free share and learning something;
they complain about ads, obscure territories, a 45°-accurate arrow, centre-to-centre distances and
the paywalled archive. Markle answers those: no ads, an exact-bearing arrow in the
game, point buildings instead of country centroids.

**Lessons applied**: two feedback channels; progressive reveal for a drawing-based clue; optional,
cheap, text-only bonus rounds that show in the share line; copy the share grammar exactly; local
midnight numbering from a fixed date; streaks rebuilt from records with an export code; a name that
cannot be mistaken for Wordle; written conventions for disputed facts (completion year, lead
architect); no ads or accounts; modes for experts rather than a separate game.

**Neighbours.** ArchiGuesser (six photos of a project), Silhouettele (landmark silhouettes with
distance), Archifinder (globe pin plus architect and year) and several "Buildle"s exist. None is a
daily concrete game, none uses original drawings, and none has the title-block rounds.
