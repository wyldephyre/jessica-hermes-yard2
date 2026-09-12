# Jessica on Hermes, Yard #2

Public thin slice of Cap's Jessica-on-Hermes control plane. Cap's private Hermes desk stays on his machine. This repo is the half you can clone, run, and demo.

For the Forgotten 99%, We Rise.

## What this repo is

One local desk process. Jessica is the data layer. The desk talks to her through `src/jessica-client.ts` only (`jessicaHealth`, `jessicaBriefing`, `askJessica`, `notifyJessica`). The store, Stripe, and Zo merge work do not live here.

The desk proves five musts:

1. One control plane. The header is Jessica on Hermes. This public slice plus Cap's Hermes desk. No CoS guts and no soul dump.
2. Observable desktop and human gates. Activity updates as actions land. File writes and specialist escalations wait for Cap.
3. File Explorer ACL. Modes are `none`, `some`, and `all` on a jailed local root. `some` allowlists paths from env. Spotlight demo.
4. Super Grok OAuth cost lane. Bulk work routes to Super Grok. A specialist runs only with a reason, a heavy token estimate, and an approved gate. Spotlight demo. This slice routes. It does not call xAI.
5. Profile to harness routing. One home, three backends: `hermes-local`, `jessica-remote`, `cursor-cloud`.

Coach voice hooks (inspiration from products like SideCoach.ai, not a clone):

- One daily objective and a check.
- FIRE cadence, work then break.
- Weekly entrepreneur review, four prompts.

## Run the desk

You need Node 22 or newer.

1. Copy `.env.example` to `.env` if you want local overrides. Leave secrets empty unless Cap gave you values.
2. Install and start:

```bash
npm install
npm start
```

3. Open `http://127.0.0.1:3344`.
4. Demo the spotlights:
   - File Explorer. Leave mode on `some`. Open `public` and `notes`. `secrets` stays deny. Switch to `all` to read the fixture. Switch to `none` to lock the tree. Queue a write under `notes`. Approve or deny it in Human gates.
   - Cost lane. Route a short task. It stays on Super Grok. Enter reason `catalog-copy`, set tokens to `9000`, route again, then approve the gate and route once more. The lane becomes `specialist` only after that.

```bash
npm test
npm run typecheck
npm run verify
```

`npm run verify` runs the tests, starts the desk, and hits the HTTP path for ACL, cost lane, gates, and coach.

## Yard thin-slice scope

In this repo:

- MIT license.
- Local Node desk (`src/desk.ts`) and one page (`public/index.html`).
- Domain types in `src/domain.ts`. ACL in `src/acl.ts`. Cost lane in `src/cost-lane.ts`.
- Fixture iron root at `fixtures/iron` (`public`, `notes`, `secrets`). The secrets file is a deny demo. It holds no tokens.
- Env names only in `.env.example`. No keys, tokens, or OAuth secrets in the tree.

Out of this repo:

- Private Jessica soul, CoS notes, or Hermes profile guts.
- Battle Buddy, ShipBit, wingman-ai, or a the99-hermes rename.
- Zo merge product work, Stripe, wallets, or an external database.
- A SideCoach.ai rebrand. Coach is three hooks, not their product.

Phase: Yard #2 scaffold. Jessica stays the data layer. Stripe stays on Zo when that work exists. This desk does not open a database.
