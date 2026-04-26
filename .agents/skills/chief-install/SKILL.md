---
name: chief-install
description: Install or refresh the Chief framework in a Codex project. Use when the user asks for /chief-install, wants Chief set up, or wants the Chief skill updated for Codex.
---

Install or refresh Chief for the current repository, with Codex as the default agent host.

## Defaults

- Agent: `codex` unless the user explicitly names another supported host.
- Scope: project-local installation under `.agents/`.
- Install mode: `copy` on Windows; `link` only when the user asks for symlinks and the environment supports them.
- Package manager for this repository: Bun for project scripts. Do not introduce npm/pnpm project scripts unless the upstream Chief installer requires a one-off CLI command.

## Supported Arguments

The first argument is optional.

- No argument, `latest`, or `stable`: install the latest tagged Chief release.
- `canary`: install the upstream canary/development branch.
- `vX.Y.Z`, branch name, or commit SHA: install that exact ref.
- `--agent <name>`: override the agent host. Supported values are `codex`, `claude-code`, `opencode`, `cursor`, `copilot`, `gemini-cli`, `amp`, `windsurf`, `kiro`, and `aider`.
- `--mode copy|link`: override install mode when supported by the installer.
- `--force`: allow replacement of existing Chief files, but only after explicitly confirming the target paths with the user.

## High-Level Rules

- Never overwrite existing repository instructions, agent files, skills, or `.chief` content without explicit approval.
- Prefer Codex-native locations: `AGENTS.md`, `.agents/agents/`, `.agents/skills/`, and `.chief/`.
- Keep Claude-specific files (`CLAUDE.md`, `.claude/`) only when the user requests Claude compatibility or when preserving an existing installation.
- Treat `.chief/` as user planning state. Back it up or merge carefully; do not replace it wholesale.
- Use Windows-safe PowerShell commands in this repository unless a required upstream script only supports POSIX shell.
- Clean up temporary install directories after success, cancellation, or failure.
- Report exactly what changed and what verification passed.

## Step 1: Detect Current State

Check for existing Chief signals:

1. `.chief/`
2. `.agents/agents/chief-agent.md`
3. `.agents/skills/grill-me/SKILL.md`
4. `AGENTS.md` or `CLAUDE.md` containing "Chief"

If any signal exists, this is an upgrade or refresh, not a fresh install. Summarize the detected files and proceed only with a non-destructive update plan. If the user asked for a fresh reinstall, ask for explicit approval before replacing anything.

Also inspect the active repo guidance before changing files:

1. `AGENTS.md`
2. `docs/ARCHITECTURE.md` when structural repo guidance may be affected
3. Existing `.chief/MANUAL.md` or `.chief/_rules/**` when aligning Chief behavior

## Step 2: Prefer GitHub CLI Skill Commands

If `gh` is available and supports `gh skill`, prefer it for installing or updating Chief skills because it understands agent hosts and Codex project locations.

Useful checks:

```powershell
gh --version
gh skill --help
```

For a project-local Codex skill install, use the upstream repository and pin only when the user gave a version:

```powershell
gh skill preview thaitype/chief chief-install --agent codex --scope project
gh skill install thaitype/chief chief-install --agent codex --scope project
```

When a version/ref is provided:

```powershell
gh skill install thaitype/chief chief-install --agent codex --scope project --pin <version-or-ref>
```

If the user asks for a different host, pass that host through `--agent`. For hosts that share `.agents/skills` at project scope, avoid duplicate installs.

If `gh skill` is unavailable, continue with the manual Git fallback.

## Step 3: Git Fallback

Resolve the target ref:

- `latest`/`stable`: query tags, ignore peeled `^{}` entries, and choose the highest semver tag.
- `canary`: use the upstream canary branch.
- Explicit tag, branch, or SHA: use the given ref.

Clone into a temporary directory:

```powershell
git clone --depth 1 --branch <ref> https://github.com/thaitype/chief.git .chief-agent-tmp
```

If the ref is a SHA and `--branch` fails, clone the default branch, fetch the SHA, and check it out.

Run the upstream setup script only when it exists and the environment can run it:

```powershell
bash .chief-agent-tmp/scripts/setup.sh --agent codex --mode copy
```

If Bash is unavailable or the script fails, perform a manual Codex install from the template.

## Step 4: Manual Codex Install

Copy only missing or approved files from `.chief-agent-tmp/template/`.

Core Codex paths:

- `.agents/agents/`
- `.agents/skills/`
- `.chief/`
- `AGENTS.md`

Merge rules:

- If `.agents/agents/<file>` is missing, copy it.
- If `.agents/skills/<skill>` is missing, copy it.
- If `.chief/` exists, copy only missing template files and preserve user milestone/rule content.
- If `AGENTS.md` exists, append a concise Chief section only if the user approves and only if Chief guidance is absent.
- Do not edit generated app code or project source files while installing Chief.

Codex model placeholders:

- Replace `${thinking_model}` in `chief-agent` with a current strong reasoning model name only when the template requires a concrete value.
- Replace `${coding_model}` in builder/tester/review-plan agents with the current Codex coding model only when the template requires a concrete value.
- If the current Codex model name is unavailable from context, leave placeholders intact and tell the user where to set them.

## Step 5: Optional Compatibility Files

Only when requested:

- `claude-code`: create or update `CLAUDE.md`, `.claude/agents/`, and `.claude/skills/`.
- `copilot`: create or update `.github/agents/` and Copilot-compatible skill locations.

For compatibility installs:

- Prefer copy mode on Windows.
- Use symlinks only after confirming Developer Mode/symlink support.
- Never replace existing compatibility files without approval.

## Step 6: Verify

Verify the Codex installation:

1. `.agents/agents/chief-agent.md`
2. `.agents/agents/builder-agent.md`
3. `.agents/agents/tester-agent.md`
4. `.agents/agents/review-plan-agent.md`
5. `.agents/skills/grill-me/SKILL.md`
6. `.chief/`
7. `AGENTS.md`

Also verify this repository remains aligned:

- `AGENTS.md` still contains the project-specific Next.js/Elysia/Prisma rules.
- `.chief/` user planning content is still present.
- No generated application output was edited.

If verification fails, fix missing files from the temporary template when available. If a file exists but differs, report the conflict instead of overwriting it.

## Step 7: Cleanup

Remove `.chief-agent-tmp` after the install or refresh is complete. On Windows, use PowerShell:

```powershell
Remove-Item -LiteralPath .chief-agent-tmp -Recurse -Force
```

Before recursive deletion, confirm the resolved path is inside the current repository.

## Step 8: Final Report

Report:

- Chief version/ref installed or refreshed.
- Agent host and install mode used.
- Files created, updated, skipped, or left for manual review.
- Verification results.
- Any follow-up needed, such as editing `.chief/project.md` or filling model placeholders.

Keep the final response concise. Do not claim Chief is installed unless verification passed.
