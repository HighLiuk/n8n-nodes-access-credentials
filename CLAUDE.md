# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` — compile TypeScript (outputs to `dist/`)
- `npm run dev` — compile in watch mode
- `npm run lint` / `npm run lintfix` — ESLint su `src/`
- `npm run format` — Prettier su `src/`
- Non ci sono test configurati.

## Architecture

Singolo file sorgente: `src/nodes/AccessCredentials/AccessCredentials.node.ts`.

Il trick chiave è il **Proxy su `description.credentials`** nel constructor: fa sì che `.find()` restituisca sempre un match, aggirando il controllo di n8n core che normalmente limita i credential type non dichiarati al solo nodo HTTP Request.

## Build & Publish

- TypeScript: `src/` → `dist/` (rootDir/outDir in tsconfig)
- Solo `dist/` viene pubblicato (`"files": ["dist"]`)
- Entry point n8n: `dist/nodes/AccessCredentials/AccessCredentials.node.js`

## ESLint

`@typescript-eslint/parser` con regole recommended. `no-explicit-any` disabilitato.
