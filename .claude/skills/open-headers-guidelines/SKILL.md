---
name: open-headers-guidelines
description: Project-specific guidelines for the Open Headers repo. Use when working on copy, translations/localization, docs, or UI strings in this project to preserve networking terms (header, request, value, host, url, path, etc.) and apply project terminology rules.
---

# Open Headers Guidelines

## Overview

Follow these rules whenever generating or editing language content in this repo, especially translations. Keep networking terms in English unless explicitly told otherwise.

## Terminology Rules

- Do not translate "header" to Swedish "Rubriker". Use "header" (or "headers") as the canonical term.
- Keep these networking terms unchanged across languages: `header`, `request`, `value`, `host`, `url`, `path`.
- For related networking terms not listed, default to leaving them in English and ask if a translation is desired.
- Preserve original casing (for example, `Header`, `URL`) when matching surrounding text.

## Future Behavior

- A future feature will handle some of these fixes automatically; until then, apply these rules manually.
