# Sqale

## Intro

Sqale is a client-side floor plan editor for turning rough rental-ad floor plan images into something you can actually reason with.

Its goal is simple: take a pixelated, badly scaled, or rotated floor plan picture, calibrate it, and project your own belongings inside it so you can visualize yourself living in the space.

The app runs without a backend: all project data is stored locally in IndexedDB.

## Features

- Plan image upload (`PNG` / `JPG`) and direct transform editing on canvas.
- Scale calibration from two picked points + known real-world distance.
- Room polygon drafting with live closure state and area calculation (`m²`).
- Furniture insertion, transform editing, color editing, and layer-level operations.
- Layer panel with contextual actions: show/hide, lock/unlock, reorder, rename, delete.
- Clipboard support for furniture copy/paste and image paste-to-plan workflows.
- Grid rendering with spacing presets and optional snap-to-grid.
- Multi-floor management (create/select/rename/delete) with persistent local storage.

## Stack

- Vue 3 + TypeScript (strict)
- Vite
- Tailwind CSS + shadcn-vue (Radix Vue primitives)
- Fabric.js
- idb (IndexedDB wrapper)
- Vitest

## Installation

```bash
npm install
npm run dev
```

Optional verification:

```bash
npm run typecheck
npm test
npm run build
```

## How It Works

```mermaid
flowchart TD
  A[Load floor plan image from rental ad] --> B{Plan rotated?}
  B -->|Yes| C[Rotate plan to align walls]
  B -->|No| D[Calibrate scale using 2 known points]
  C --> D
  D --> E{Still visually off?}
  E -->|Yes| F[Stretch / resize plan to match known dimensions]
  E -->|No| G[Draw rooms at scale on top of the plan]
  F --> G
  G --> H[Place furniture at scale]
  H --> I[Project your belongings and test how you'd live in the space]
```

### Folder Conventions

- `src/components/ui/*`: framework-level reusable UI primitives only.
- `src/features/*`: product-level behavior grouped by feature.
- `src/storage/*`: persistence boundary (IndexedDB).
- `src/types/*`: shared domain types.
