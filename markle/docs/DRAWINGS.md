# Drawing spec

Every puzzle is one SVG drawing in `drawings/NNN.svg` (the sheet number, so file names never
spoil the answer). The engine inlines it and reveals it one layer per wrong guess. Drawings carry
class names only; all colour and line weight comes from `styles/drawing.css`, so one file works
in light and dark themes.

Check a drawing by eye with:

```bash
node tools/render-drawing.mjs drawings/003.svg /tmp/003.png          # all six stages, light
node tools/render-drawing.mjs drawings/003.svg /tmp/003d.png --dark  # dark theme
node tools/render-drawing.mjs drawings/003.svg /tmp/003-5.png --stage 5
```

## Frame

- Root element exactly: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" data-focus="X Y">`
  - No `width`/`height`, no `<title>`/`<desc>`, no `<text>`, no inline `style`, no colour attributes.
  - `data-focus` is the centre point for close-up mode (see below).
- 4:3 frame, 1200 x 900 units. Ground line between y = 720 and y = 820.
- One uniform scale per drawing, true proportions. Choose it so the building fills 65–85% of the
  frame width or height, with at least 40 units of margin. Record the scale as `pxPerM`
  (units per metre) in the puzzle data.
- Orthographic only: elevation, interior elevation or section. No perspective, no cast shadows.

## Layers

Every element sits in exactly one `<g data-layer="N">`, N = 1..5, in this order. Stage N shows
layers 1..N. Layers go from least to most revealing; hold the single most iconic feature back to
layer 3 or later when the silhouette alone would give the building away to everyone.

| Layer | Name | Contents |
|---|---|---|
| 1 | Silhouette | The building's outline in this view as filled `sil` shapes, plus the ground line (`gnd`). Nothing else. Must use verified dimensions only. |
| 2 | Structure | The outline again as `ln` strokes, then the primary structure: slabs, frames, cores, columns, stems, bridges, porticoes (`ln`, `ln2`); hidden volumes as dashed `hid`; one 1.75 m human figure (`fig`) standing on the ground line for scale. |
| 3 | Openings | Glazing (`glz`), dark voids and recesses (`void`), light openings such as the Church of the Light's cross (`lit`), doors, balconies, slits. |
| 4 | Surface | Material: board marks, formwork joints, tie holes (`dot`), bush-hammer stipple, lift lines (`ln3`), shading (`shd`), and at most one accent tint (`acc` / `acc-ln`) where the building has an iconic non-concrete colour. |
| 5 | Context | Terrain, water (`wtr`), trees, horizon features, neighbouring buildings (`ctx`). |

At stage 1 the `sil` fill renders solid ink; from stage 2 it pales to concrete poché and the
linework draws over it.

## Classes

| Class | Use |
|---|---|
| `sil` | silhouette fill (layer 1 only) |
| `gnd` | ground line, heavy |
| `ln` | primary line: outlines, main structure |
| `ln2` | secondary line: floor edges, mullions, frames |
| `ln3` | hairline: texture, board marks, joints |
| `hid` | dashed hidden line |
| `fig` | the scale figure |
| `ctx` | context linework (lighter) |
| `wtr` | water, dashed |
| `glz` | glazing fill |
| `void` | dark opening / deep shadow fill |
| `lit` | light opening fill |
| `shd` | mid shade fill |
| `dot` | small fills: tie holes, stipple |
| `ink` | solid ink fill |
| `acc`, `acc-ln` | accent colour fill / stroke (one per drawing, layer 4 or later) |

## Rules

- Stroke widths come from CSS (`vector-effect: non-scaling-stroke`); never set `stroke-width`.
- No `id` attributes unless unavoidable (clip paths); if needed, prefix with the sheet number
  (`s003-clip`), because several drawings can be on screen at once in the register.
- Keep each file under 60 KB: plain `<path>`, `<rect>`, `<line>`, `<circle>`, `<polygon>`.
- Honesty: the silhouette and structure use only verified dimensions. Estimated detail is allowed
  in layers 4–5 only, and only when generic. When in doubt, leave it out.

## Close-up mode

In close-up mode the whole drawing is shown from the start, cropped around `data-focus`. The crop
widens each guess: 2, 5, 10, 20, 50 m wide, then the full frame. Put the focus on a telling
junction or edge (a tie-hole corner, a slab edge, a column foot), never on the single most iconic
feature.
