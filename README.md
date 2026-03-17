# BiteCraft

BiteCraft is a local-first recipe card builder built with SvelteKit. It gives you a fast split-screen workflow for writing a recipe on one side and shaping a polished, shareable recipe card on the other.

The app is designed for quick iteration: drafts autosave in the browser, recipes can be stored as named snapshots, cards can be copied as images, and entire recipes can be shared through compressed links or plain JSON.

## Highlights

- Live recipe editing with instant visual preview
- Three presentation themes: `Classic`, `Minimal`, and `Bold`
- Local-first draft persistence with autosave
- Named recipe snapshots stored in `localStorage`
- JSON import and export for recipes
- Shareable recipe links using compressed URL payloads
- Copy recipe cards to the clipboard as PNG images
- Mobile-friendly layout with editor/preview tabs
- Reorder ingredients and steps with drag interactions

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/)
- [Svelte 5](https://svelte.dev/)
- [Vite](https://vite.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- `bits-ui` + custom UI primitives
- `svelte-sonner` for toast feedback

## Getting Started

### Prerequisites

- Node.js 20+
- `pnpm` recommended

### Install

```bash
pnpm install
```

### Start the development server

```bash
pnpm dev
```

Open the local URL shown in the terminal, usually `http://localhost:5173`.

## Available Scripts

```bash
pnpm dev          # start local development
pnpm build        # create a production build
pnpm preview      # preview the production build locally
pnpm check        # run Svelte type and diagnostics checks
pnpm check:watch  # run checks in watch mode
```

## What You Can Do

### Build recipe cards visually

Create a recipe with:

- title and description
- hero image URL
- servings, prep time, and cook time
- structured ingredients with `name`, `amount`, and `unit`
- step-by-step method
- selectable visual theme

The preview updates immediately as you edit.

### Save work without a backend

BiteCraft keeps everything in the browser:

- your current draft is autosaved
- named snapshots can be saved and reloaded later
- snapshots can be deleted without affecting the current draft

No database or server storage is required for the core experience.

### Share recipes in multiple formats

Recipes can be moved around in three ways:

- `Copy JSON` for raw recipe data
- `Import JSON` to load a recipe object into the editor
- `Copy share link` to generate a compressed URL-based share payload

### Export polished cards

The preview can be copied as an image directly to the clipboard, making it easy to paste into chat apps, docs, or design tools.

Note: remote hero images must allow fetching from the browser for image export to succeed.

## Project Structure

```text
src/
  routes/+page.svelte              # main app shell and recipe workflow
  lib/components/RecipeEditor.svelte
  lib/components/RecipePreview.svelte
  lib/storage.ts                   # draft + snapshot persistence
  lib/share.ts                     # compressed share-link encoding
  lib/image.ts                     # DOM-to-image clipboard export
  lib/defaultRecipe.ts             # starter recipe data
  lib/types.ts                     # recipe types
```

## Recipe Model

Recipes are stored as a simple object containing:

- title
- description
- hero image URL and image framing values
- servings
- prep minutes
- cook minutes
- ingredients as objects like `{ "name": "Fresh parsley", "amount": 2, "unit": "tbsp" }`
- steps
- theme

Input is normalized before loading from storage or imports, which helps keep saved data valid even if older or malformed payloads are loaded.

## Development Notes

- The app is currently client-side and browser-storage based.
- Share links are encoded into a query parameter rather than stored remotely.
- The default SvelteKit adapter is `@sveltejs/adapter-auto`.
- Styling uses Tailwind CSS v4 plus app-level theme tokens in [`src/app.css`](./src/app.css).

## Future Ideas

- downloadable PNG files in addition to clipboard copy
- optional cloud sync
- print-friendly recipe layout
- custom theme creation
- ingredient sections and timers

## License

Private project unless you choose to add a license.
