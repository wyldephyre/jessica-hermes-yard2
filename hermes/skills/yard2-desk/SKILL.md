---
name: yard2-desk
description: Drive Yard #2 desk ACL, Cap gates, Super Grok lane, and daily ONE.
version: 0.1.0
license: MIT
platforms:
  - linux
  - macos
  - windows
metadata:
  hermes:
    tags: [jessica, yard2, desk, acl, coach]
    category: jessica
    config:
      - key: yard2.desk_url
        description: URL of the local Yard #2 Node desk
        prompt: Yard #2 desk URL
---

# Yard #2 desk

Cap-facing control plane for Jessica on Hermes. The Node desk on localhost is the judge and API. This skill does not replace that desk.

`/yard2-desk` is **not** a Desktop builtin slash. It is an unknown command. After `/reload-skills` (or a restart), ask in plain language: `Use yard2-desk: home`. `/skills` lists it.

Live tree on Cap iron: `D:\TheForge\JessicaHermes\skills\software-development\yard2-desk`.

## When to use

Use when Cap asks for the Yard #2 control plane, File Explorer ACL, a write or specialist approve gate, Super Grok vs specialist, or the daily ONE coach check.

## Procedure

Run the bundled CLI. It posts the same `DeskAction` types as `src/domain.ts`. Do not invent fields.

```bash
node scripts/desk.mjs <command>
```

From this repo you can also run `npm run skill -- <command>`. The skill directory is the folder that holds this `SKILL.md`.

Live mode talks to `YARD2_DESK_URL`, default `http://127.0.0.1:3344`. Start the desk with `npm start` in the yard2 checkout first. If Hermes stored `yard2.desk_url`, export that value as `YARD2_DESK_URL` before you run the CLI.

Mock mode (`YARD2_DESK_MODE=mock`) boots a throwaway copy of that same desk from the checkout. It needs `src/desk.ts`. Set `YARD2_REPO` if you copied only this folder.

Commands:

1. `home` shows the control plane snapshot.
2. `acl none|some|all` flips File Explorer ACL.
3. `write <path> <content>` then `approve <id>` is the Cap gate for a write.
4. `lane <task> [tokens] [reason]` then `approve <id>` keeps Super Grok as default. Specialist runs only after reason plus gate.
5. `coach-one` marks the daily ONE check.

Cap demo, under three minutes, after the desk is up. In Hermes Desktop run `/reload-skills` first, then:

```text
Use yard2-desk: home
Use yard2-desk: acl some
Use yard2-desk: acl none
Use yard2-desk: acl all
Use yard2-desk: acl some
Use yard2-desk: write notes/from-skill.txt gated skill write
Use yard2-desk: approve <id from write>
Use yard2-desk: lane titles 1200
Use yard2-desk: lane titles 9000 skill-escalate
Use yard2-desk: approve <id from lane>
Use yard2-desk: lane titles 9000 skill-escalate
Use yard2-desk: coach-one
```

Or one shot with no Hermes: `node scripts/desk.mjs demo` (desk must be up).

`GET /api/state` and `POST /api/action` are the only HTTP paths. Action bodies are `DeskAction` in `src/domain.ts`.

## Pitfalls

- Not a Desktop builtin slash. `/yard2-desk` is unknown. Use `/reload-skills`, `/skills`, or `Use yard2-desk: home`.
- Live mode fails if the desk is not running. Start it. Do not open a second domain.
- Mock mode does not keep state across separate CLI processes. Use `demo` or live mode for a Cap session.
- Writes and specialist escalations wait for Cap. A short lane stays on Super Grok.
- Do not dump soul files, CoS notes, or secrets. `.env.example` has names only.
- Panel and plugin work is stretch. Do not block this skill on them.
- Stock Hermes `~/.hermes/skills/` is **not Cap's live tree**.

## Verification

```bash
npm run skill -- demo
node scripts/skill-metric.mjs --require-target
```

Expect `MUST home|acl|gate|lane|coach PASS` and `5/5`.
