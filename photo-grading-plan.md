# Photo grading plan

Reverse-engineer the look from two reference JPEGs and apply it to a batch in
Lightroom mobile. No RAW available — work from the references only.

## What the look is

A Kodak-style warm color negative emulation. Three moves are read directly from
the reference files (high confidence):

1. **Highlights are warm peach, not white.** R > G > B in highlights by a wide
   margin. Window light in image 1 ≈ (245, 220, 180). The blue curve highlight
   point is pulled DOWN; green pulled down a hair.
2. **Blues are desaturated and luminance-lifted.** Baby's shirt ≈ (60, 90, 130)
   — sky/cyan blue, not saturated cobalt. Wall in image 1 ≈ (80, 110, 115).
3. **Oranges are saturated.** Wood ≈ (140, 90, 50), fur rug ≈ (180, 110, 60),
   skin pushed warm. Orange channel sat up; hue shifted slightly toward red.

Differences between the two references are **situational, not part of the
grade**:

- Image 1: lifted shadows + haze because backlit
- Image 2: closed shadows + no haze because front-lit interior

Don't bake lift/haze into the base preset. Apply per-photo.

## Starting preset for Lightroom mobile

Confidence marked: **[H]** read from images, **[M]** educated guess from look
family, **[L]** starting point — expect to tune.

### White Balance

- Temp +20 [M]
- Tint +5 [M]

### Tone

- Contrast −10 [M]
- Highlights −20 [H]
- Shadows +10 [M] (push to +25 only on backlit/hazy shots)
- Whites −10 [M]
- Blacks +5 [M] (push to +15 on backlit shots)

### Presence

- Texture −5 [L]
- Clarity −5 [L]
- Dehaze 0 [M] (push to −5 on backlit shots)
- Vibrance +8 [L]
- Saturation −5 [L]

### Tone Curve — Blue channel (most important move) [H]

- Highlights: pull down to ~235
- Shadows: pull down to ~5 (warms shadows further)

### Tone Curve — Red channel [M]

- Shadows: lift to ~10

### HSL [H direction, M magnitude]

- Orange: Sat +10, Lum +5, Hue −5
- Yellow: Sat −10, Lum +5, Hue −10
- Blue: Sat −25, Lum +10, Hue +10
- Aqua: Sat −15
- Green: Sat −15, Hue +10

### Color Grading [L — guesses, refine after curves are right]

- Shadows: Hue 30, Sat 8
- Highlights: Hue 25, Sat 10
- Blending 50, Balance +10

### Effects

- Grain 12 / Size 25 / Roughness 50 [M]
- Vignette −6 [M]

### Calibration [L]

Leave alone until everything else is dialed.

## Iteration loop without RAW

You can't validate against the reference's pre-grade state — but you don't need
to. The output of your graded batch photo just needs to match the output of the
reference.

1. Apply preset to one batch photo. Pick a front-lit interior first (image 2
   territory). Image 1's haze is harder to match.
2. Open reference and your graded photo side by side in LR mobile.
3. Tap-and-hold to sample matching zones in both:
   - A neutral skin midtone if available
   - A warm highlight (window, lamp, sunlit edge)
   - A blue or cyan area
   - A deep shadow
4. Compare RGB readouts. Where they diverge, that's the next adjustment:
   - Highlights too yellow, not peach enough → push blue curve highlight further
     down, or pull green slightly down
   - Blues too saturated → drop Blue HSL sat further
   - Skin not warm enough → Temp up, or Orange Lum/Sat up
   - Shadows too cool → Red curve shadow lift more, or Color Grading shadow hue
     toward 25–30
5. Save as v2. Repeat once on a backlit shot, save as **Reference Look —
   backlit** with shadows +25, blacks +15, dehaze −5, clarity −8 baked in.
6. Apply to batch. Per photo, only touch Exposure + WB.

## Two presets, not one

- **Reference Look — base** — front-lit, image 2 style
- **Reference Look — backlit** — image 1 style with lift/haze baked in

Most of the batch uses base. Switch to backlit when the light source is behind
the subject.

## Non-grading characteristics

- **Grain** — film-like, fine, ~10–15 in LR. In the preset.
- **Halation/glow around backlit edges** (image 1 only) — looks like a lens/film
  characteristic, not a Lightroom move. LR mobile can't selectively bloom
  highlights. Texture −, Clarity −, Dehaze − is a ~70% approximation. For a true
  match, use a desktop tool.
- **Slight vignette** — subtle in image 1. In the preset at −6.
- **Warm flare/haze** — image 1 only, situational. Apply via the backlit preset.

## On LUTs

LR mobile doesn't import 3D LUTs. The equivalent is the preset above. For a true
LUT-portable workflow (Premiere, Resolve), build the look in DaVinci Resolve,
export `.cube`. For LR-only, skip it.

A custom **DCP camera profile** (built from a color checker shot on your camera)
would handle the gamut/calibration layer separately from the creative grade —
worth doing once if you shoot a lot on the same body. Out of scope for this
batch.
