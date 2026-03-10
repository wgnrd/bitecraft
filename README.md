# BiteCraft Recipe Card Builder

UI-first MVP built with SvelteKit, Tailwind CSS, and shadcn-svelte.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal (usually `http://localhost:5173`).

## What’s included

- Two-panel builder UI
  - Desktop: editor (left) + live preview (right)
  - Mobile: tabs to switch between editor and preview
- Recipe editor fields
  - Title, description, servings, prep time, cook time
  - Add/remove/reorder ingredients
  - Add/remove/reorder steps
- Live recipe card preview with 3 themes
  - `Classic`, `Minimal`, `Bold`
- Local persistence
  - Loads from `localStorage` on mount
  - Autosaves with debounce
  - Save named recipe snapshots in browser storage
  - Load/delete saved snapshots
  - Create a new empty recipe draft
  - Import recipe JSON into the current draft
  - Reset button with confirmation dialog
- Premium interaction polish
  - Sticky action header with saved/unsaved state chip
  - Overflow actions menu (new/import/load/delete/reset)
  - Toast feedback for save/import/reset/load/delete actions
- Basic validation and UX polish
  - Max lengths for title/description
  - Disabled add buttons for empty draft rows
  - Empty-state hints and entry transitions
