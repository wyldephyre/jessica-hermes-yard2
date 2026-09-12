# Yard #2 Cap demo — cue card (≤3 min)

Desk up at `http://127.0.0.1:3344`. Hermes: `/reload-skills` (or restart), then plain language. `/yard2-desk` is not a Desktop builtin.

Voice: Fire / PHYRE / flame / ash / wildfire / Phoenix / forgotten 99% / Active Stoicism / Oorah.
Never: Prometheus / Satan / Hooah / corporate wellness.

Judge with no Hermes: `npm run skill -- demo` (desk must be up). Expect `MUST home|acl|gate|lane|coach PASS`.

## 0:00 — Home header

Open the desk. Header reads **Jessica on Hermes**. Banner: For the Forgotten 99%, We Rise.

Hermes: `Use yard2-desk: home`

Speak: one control plane. Jessica is the data layer. This public slice plus Cap's desk. No soul dump. PHYRE stays on this iron.

## 0:20 — ACL none → some → all → some

Flip File Explorer ACL in this order:

1. `none` — tree locked. Ash. Nothing walks.
2. `some` — `public` and `notes` open. `secrets` stays deny. Spotlight.
3. `all` — fixture `secrets/do-not-read.txt` is readable. Demo text only. No tokens.
4. `some` — back to the working flame. Secrets deny again.

Hermes: `Use yard2-desk: acl none` then `some` then `all` then `some`.

## 1:10 — Write + approve gate

Queue a write under `notes` (`notes/from-skill.txt` or the desk box). Human gates show pending. Cap approves. File lands. Writes wait. That is the gate, not a suggestion.

Hermes: `Use yard2-desk: write notes/from-skill.txt gated skill write` then `Use yard2-desk: approve <id>`.

## 1:50 — Super Grok cost lane

Short route (tokens ~1200, no reason). Lane stays **Super Grok**. Bulk work burns here. This slice routes. It does not call xAI.

Then 9000 tokens + reason (`skill-escalate` or `catalog-copy`). Lane waits. Approve the specialist gate. Route again. Specialist earned only after reason + heavy estimate + Cap yes.

Hermes: `Use yard2-desk: lane titles 1200` then `Use yard2-desk: lane titles 9000 skill-escalate` then approve then route the 9000 line again.

## 2:35 — Coach ONE + FIRE

Check the daily ONE. Active Stoicism: can't fix their system, build yours. FIRE is work then break — hygiene, not a wellness pitch. Phoenix from the ash. Close: For the Forgotten 99%, We Rise. Oorah.

Hermes: `Use yard2-desk: coach-one`

Cue card ends. Do not wander into panel, plugin, Zo, or Stripe.
