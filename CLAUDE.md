# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is a static, browser-only React prototype for **沪屙屙 · 上海地铁找厕所**. There is no package manager metadata, bundler config, or test runner in the repository. React, ReactDOM, Babel Standalone, and MapLibre are loaded from CDN in the HTML files, and JSX is executed in the browser via `<script type="text/babel">`.

## Running and checking locally

Because this is a static app, use a local static server rather than `npm` commands:

```bash
python -m http.server 8000
```

Then open one of the HTML entry points:

- `http://localhost:8000/沪屙屙.html` — main desktop/framed preview with MapLibre map tab.
- `http://localhost:8000/沪屙屙-真机版.html` — phone/PWA-style page using external JSX source files and `window.__NATIVE__ = true`.
- `http://localhost:8000/build.html` — bundled/framed build without the real map screen; map tab is a placeholder.
- `沪屙屙 (iPhone版).html` and `沪屙屙 (离线版).html` are self-unpacking bundled artifacts.

There are currently no `build`, `lint`, or `test` scripts. For syntax/runtime validation, load the target HTML in a browser and watch the DevTools console. For route/recommendation logic changes, exercise representative `findRoute(...)`, `decideStrategy(...)`, and `recommend(...)` calls from the browser console after the app loads.

## Architecture

### Global-script module pattern

All source files define globals on `window`; there is no ES module import/export graph. Script order matters:

1. `data.jsx` (or `data_0.jsx` through `data_8.jsx` followed by `data_build.jsx`) defines metro line/toilet data helpers.
2. `icons.jsx` defines the `Ic` SVG icon registry.
3. `components.jsx` defines shared UI primitives (`LineDot`, `LineBadges`, `GlassCard`, `SectionLabel`, `Segmented`).
4. `strategy.jsx` defines routing, travel-time estimation, strategy selection, and toilet ranking.
5. `home.jsx` defines the main form and urgency slider.
6. `sheets.jsx` defines bottom sheets for search results, toilet details, and station picking.
7. `map.jsx` defines `MapScreen` for the full map-enabled build.
8. `app.jsx` mounts the app and switches tabs/sheets.

When adding new shared functions/components, attach them with `Object.assign(window, { ... })` if another file needs them.

### Data model

`data_0.jsx` initializes `LINE_COLORS`, `LINE_ORDER`, display helpers, and `window.__metro.addLine(...)`. `data_1.jsx` through `data_8.jsx` register raw rows for metro lines 1-18 plus 浦江线. `data_build.jsx` transforms those raw rows into the runtime globals:

- `LINES`: ordered station names per line.
- `STATIONS`: station objects with `id`, `name`, `lines`, `hub`, `exits`, and `toilets`.
- `byId`, `linesOf`, `toiletById`, `toiletLocBrief`, `toiletLocFull`.

`data.jsx` is the combined generated data file. Its header says to edit `data_N` sources and rebuild/recombine rather than hand-editing individual entries inside `data.jsx`.

### Routing and recommendation logic

`strategy.jsx` builds an adjacency graph from `LINES`, computes routes with Dijkstra-like scoring (`findRoute`), estimates travel time (`metroTravel`), selects candidate stations in the rider's direction (`candidateStations`), and ranks toilets (`rankToilets`). `decideStrategy` chooses between `near`, `transfer`, and `terminal`, and `recommend` returns both the selected strategy and ranked toilets.

UI code treats a ranked result as `{ toilet, station, score, travelMin, totalMin, inTime, isTransfer, isCur, isDest, reasonTags }`. Keep that shape stable when changing recommendation behavior because `sheets.jsx` and `app.jsx` pass it through to detail views.

### UI flow

`app.jsx` owns the top-level state: current station, destination, gender, need, hold time, active tab, active sheet, and selected toilet detail. `HomeScreen` reads and updates that state, `ResultSheet` calls `recommend(st)`, and `StationPicker` uses `sortStationsForPicker(...)` plus `LINES`/`STATIONS` for station selection.

The CSS for most UI lives inline inside the HTML entry files, not in separate CSS files. If changing styles, update the relevant HTML artifact(s) as well as any source assumptions in JSX.

### Map screen

`map.jsx` uses MapLibre GL with OpenFreeMap road tiles and Esri satellite raster tiles. The map-enabled `沪屙屙.html` loads local GeoJSON assets from `geo/shanghai_subway_line.geojson` and `geo/shanghai_subway_station.geojson` for real line/station geometry, then matches station names back to `STATIONS`/`byId` for toilet details. The source `app.jsx` renders `<MapScreen />` when `window.MapScreen` is loaded, otherwise falls back to a placeholder for entry points that do not include the map module.
