# Conventions

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/). Required because the release workflow generates changelogs from commit messages.

Format: `<type>(<optional scope>): <description>`

Types:
- `feat:` — new feature
- `fix:` — bug fix
- `style:` — visual/UI changes (not code style)
- `refactor:` — code restructuring without behavior change
- `docs:` — documentation only
- `chore:` — maintenance tasks (deps, CI, config)
- `test:` — adding or updating tests

Keep descriptions lowercase, imperative, concise. No trailing period.

## Terminology

Keep networking terms in English across all languages: header, request, value, host, url, path. Do not translate "header" to Swedish "Rubriker".

For related networking terms not listed, default to English and ask if a translation is desired.
