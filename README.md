# Arithmetic Split

Why do two minutes of mental arithmetic produce 83 answers on a laptop and 96 on a phone? These are the participant’s reported Zetamac averages. Arithmetic Split is an independent browser experiment that measures new attempts and tests whether a device advantage persists during number copying.

## Start

Open the live app on both devices, or extract the archive and open `dist/index.html` in a desktop browser. A local web server gives a stable storage origin. From the extracted folder run `py -m http.server 8000 --directory dist` on Windows (use `python3` on macOS/Linux), then open `http://localhost:8000`. Static hosting can serve the contents of `dist/` on both devices. No build step, API keys, packages or backend are required. The zip download in the hosted footer is a distribution asset.

## Procedure

1. Four rounds, each with one solve and one copy run on each device. Each run lasts 120 seconds. Use laptop first in rounds 1 and 3 and mobile first in rounds 2 and 4. The app alternates the mode order and suggests your next local run. Use your normal hardware or native phone keyboard. Keep your browser and settings consistent. Leaving the page during a run discards that incomplete run.
2. Each block of 16 has the same questions and answers across devices and modes, shuffled separately. Four questions use each arithmetic operation. Number ranges are printed in the Protocol tab. Subtraction inverts addition and exact integer division inverts multiplication. Faster devices complete more blocks. Incomplete blocks can differ in composition. This app's balancing, interface and transition timing can differ from the original arithmetic game.
3. After three calibration rounds, export JSON from one device, transfer it to the other, and import it. Export the merged dataset and import it on the first device. This unlocks round 4 in both browsers. Duplicate imports leave identical runs intact. Conflicting records are rejected. Use regular browsing and export a backup before clearing browser storage.
4. Before the fourth round, the app takes the mean of the three paired mobile-minus-laptop solve score differences. Calibration slots cannot be overwritten in the interface. The forecast uses no round 4 data. Complete the held-out runs and repeat the transfer. The Results tab compares predictions and observations and separates calibration summaries from held-out measurements.

## Reading the results

The copy task removes arithmetic while keeping matched answer values. Compare the average milliseconds per completed answer across devices for each task. Differences in scores have a nonlinear relationship to differences in time per answer. The timing of the first digit includes perception, decision and movement. Remaining entry time covers the interval from the first digit to acceptance. A corrected trial has at least one deletion or replacement; the rate uses completed trials as its denominator. CSV includes unfinished prompts and event sequences. Only input to the answer box is recorded, and there is no network submission of keystrokes.

One person's data and one test round support an exploratory comparison. Practice effects, the interface, keyboard layout, latency, attention and a partially completed question can affect the comparison. Record a conclusion only after measuring real runs.

## Code

- `dist/index.html`, `dist/style.css`: responsive interface.
- `dist/engine.js`: seeded generation, timing model, validation, merging and prediction.
- `dist/app.js`: browser input, timer, storage, guided sessions, results and exports.
- `tests/engine.test.js`: deterministic tests with synthetic data only. With Node.js 18+ installed, run `node --test tests/engine.test.js` from the project folder.

Inspired by the [Zetamac Arithmetic Game](https://arithmetic.zetamac.com/). Project implementation generated with AI assistance. Experimental data and interpretation belong to the participant collecting them.
