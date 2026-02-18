---
name: git-flow
description: Git workflow, branching strategy, commit conventions, and PR process for this project. Use when creating branches, writing commits, preparing PRs, doing releases, or handling hotfixes.
---

# Git Flow Skill

A consistent Git workflow for the JAY-RAG-TOOLS project. Follow this skill whenever
you create branches, write commits, open PRs, cut releases, or handle hotfixes.

---

## Branch Strategy

This project uses a simplified **GitHub Flow** — one long-lived branch (`main`) plus
short-lived feature/fix branches. No `develop` branch.

```
main
 ├── feature/add-table-extraction
 ├── feature/fastapi-server
 ├── fix/thai-ocr-encoding
 ├── hotfix/ollama-connection-crash
 └── release/v1.1.0
```

### Branch Types & Naming

| Type | Pattern | When to Use |
|---|---|---|
| Feature | `feature/<short-description>` | New functionality from roadmap |
| Bug Fix | `fix/<short-description>` | Non-urgent bug in any branch |
| Hotfix | `hotfix/<short-description>` | Urgent bug in production/main |
| Release | `release/v<major>.<minor>.<patch>` | Preparing a version release |
| Chore | `chore/<short-description>` | Deps, CI, config, docs only |
| Experiment | `experiment/<short-description>` | Trying new ideas, may not merge |

### Naming Rules
- Use **lowercase kebab-case** only: `feature/add-gemini-provider` ✅
- No spaces, no underscores, no uppercase: `feature/Add_Gemini` ❌
- Keep it short but descriptive — max 5 words after the prefix
- Reference issue number if exists: `feature/42-gemini-provider`

---

## Commit Message Convention

Follow **Conventional Commits** format:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

### Types

| Type | When to Use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructure, no behavior change |
| `test` | Adding or fixing tests |
| `chore` | Build, deps, CI, config |
| `perf` | Performance improvement |
| `style` | Formatting, linting (no logic change) |

### Scopes (project-specific)

| Scope | What it covers |
|---|---|
| `processor` | src/processor.py — core PDF logic |
| `providers` | src/providers/* — vision LLM providers |
| `prompts` | src/prompts.py — Thai/EN prompts |
| `cli` | src/main.py — CLI interface |
| `docs` | docs/* or README.md |
| `deps` | requirements.txt changes |
| `ci` | GitHub Actions, workflows |

### Commit Examples

```bash
# Good commits
feat(providers): add Google Gemini vision provider
fix(processor): handle corrupted image bytes gracefully
feat(prompts): add English prompt set with --lang en flag
refactor(providers): extract retry logic to base class
docs(flowise): add nginx static file serving example
chore(deps): upgrade pymupdf to 1.24.0
perf(processor): skip duplicate xref images to reduce redundant calls
fix(cli): resolve crash when output directory already exists

# Bad commits — avoid these
git commit -m "fix bug"
git commit -m "update stuff"
git commit -m "WIP"
git commit -m "asdfgh"
```

### Rules
- Summary line: **max 72 characters**, imperative mood ("add" not "added")
- No period at end of summary line
- Body: explain **why**, not what (the diff shows what)
- Reference issues in footer: `Closes #42` or `Refs #15`

---

## Daily Workflow — Feature Development

```bash
# 1. Always start from latest main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/add-table-extraction

# 3. Work in small, logical commits
git add src/processor.py
git commit -m "feat(processor): detect table regions using PyMuPDF blocks"

git add src/prompts.py
git commit -m "feat(prompts): add Thai table extraction prompt"

# 4. Push branch and open PR
git push origin feature/add-table-extraction
# → Open PR on GitHub

# 5. After PR merged, clean up
git checkout main
git pull origin main
git branch -d feature/add-table-extraction
```

---

## Pull Request (PR) Guidelines

### PR Title
Same format as commit messages:
```
feat(providers): add Google Gemini vision provider
fix(processor): handle corrupted image bytes on Strategy B
```

### PR Description Template

```markdown
## What
Brief description of what this PR does.

## Why
Why this change is needed. Link to issue if exists.

## How
Key implementation decisions or approach taken.

## Testing
How you tested this. Which provider/model was used.
- [ ] Tested with Ollama qwen2.5vl
- [ ] Tested with Thai PDF
- [ ] Tested batch processing

## Breaking Changes
None / List any breaking changes here.

Closes #<issue_number>
```

### PR Rules
- PRs should be **small and focused** — one feature or fix per PR
- All PRs target `main` unless it's a hotfix on a release branch
- Self-review your diff before requesting review
- Keep PRs under 400 lines changed where possible — split if larger

---

## Release Flow

This project uses **Semantic Versioning**: `v<MAJOR>.<MINOR>.<PATCH>`

| Version bump | When |
|---|---|
| `PATCH` (v1.0.1) | Bug fixes, no new features |
| `MINOR` (v1.1.0) | New features, backward compatible |
| `MAJOR` (v2.0.0) | Breaking changes to CLI or output format |

### Cutting a Release

```bash
# 1. Create release branch from main
git checkout main && git pull origin main
git checkout -b release/v1.1.0

# 2. Update version references
# - Update version in src/__init__.py (if exists)
# - Update CHANGELOG.md

# 3. Commit version bump
git commit -am "chore(release): bump version to v1.1.0"

# 4. Push and merge to main via PR
git push origin release/v1.1.0
# → Open PR: "release: v1.1.0"

# 5. After merge, tag on main
git checkout main && git pull origin main
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

---

## Hotfix Flow

For urgent bugs that need to go to main immediately:

```bash
# 1. Branch from main
git checkout main && git pull origin main
git checkout -b hotfix/ollama-connection-crash

# 2. Fix and commit
git commit -m "fix(providers): handle ollama ConnectionRefusedError on startup"

# 3. PR directly to main, mark as urgent
git push origin hotfix/ollama-connection-crash
# → Open PR with [HOTFIX] prefix in title

# 4. After merge, tag patch release
git tag -a v1.0.1 -m "Hotfix v1.0.1 — ollama connection crash"
git push origin v1.0.1
```

---

## CHANGELOG.md Convention

Maintain a `CHANGELOG.md` at repo root. Update before every release.

```markdown
# Changelog

## [Unreleased]
### Added
- Gemini vision provider support

## [v1.1.0] - 2026-03-01
### Added
- Table extraction to Markdown format
- `--lang en` flag for English documents
- FastAPI server endpoint

### Fixed
- Thai character encoding issue on Windows

### Changed
- Default model changed from llama3.2-vision to qwen2.5vl

## [v1.0.0] - 2026-02-18
### Added
- Initial release
- Ollama, OpenAI, Claude provider support
- [IMAGE:...] tag system for Flowise chat display
- Thai-first prompts
- Batch PDF processing
```

---

## Commit Author Rules

**NEVER use Claude as the commit author.** All commits must be authored by the human developer.

Before making any commit, verify the git author is set to the developer — not Claude:

```bash
# Check current author config
git config user.name
git config user.email

# If not set correctly, fix it
git config user.name "Your Name"
git config user.email "your@email.com"
```

### Rules
- Never set `user.name` to "Claude", "Claude Code", "Anthropic", or any AI identity
- Never use `--author="Claude <claude@anthropic.com>"` in commit commands
- Never include "Co-authored-by: Claude" or "Generated by Claude" in commit messages
- The commit history must represent the human developer's work only
- If Claude Code is assisting with a commit, the human is still the author

---

## .gitignore Reminders

These are already in `.gitignore` but worth remembering:
- Never commit `output/` — processed PDFs and images can be large
- Never commit `.env` or API keys
- Never commit `.claude/` local runtime files
- `CLAUDE.md` itself **should** be committed — it's project documentation

---

## Quick Reference

```bash
# Start new feature
git checkout main && git pull && git checkout -b feature/<name>

# Save progress
git add -p   # stage interactively (preferred over git add .)
git commit -m "feat(<scope>): <summary>"

# Sync with main mid-feature
git fetch origin
git rebase origin/main

# Push and open PR
git push origin feature/<name>

# Clean up after merge
git checkout main && git pull
git branch -d feature/<name>
```
