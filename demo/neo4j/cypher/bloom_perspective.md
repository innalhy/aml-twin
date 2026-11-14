# Bloom perspective — TwinAML sandbox week

Use this after `load_twin.cypher` (or `python -m twinaml_sandbox.neo4j_link --write`) has loaded the tagged graph. Bloom is an inspection view of the same ledger the Streamlit app reads from CSV. If Bloom is not available, stay on the Streamlit **Network** tab. That picture is the offline twin.

The amount line is a classroom dial. Colors in Bloom are teaching styles. A color is not a compliance score.

## Perspective

Create a perspective named **TwinAML sandbox week**.

| Category | Label | What it is, in plain words |
| --- | --- | --- |
| Account | `Account` | A synthetic bank account |
| Wallet | `Wallet` | A synthetic wallet. The mixer is also a wallet |
| Watchlist wallet | `WatchlistWallet` | A wallet the classroom list calls a mixer |
| Person | `Person` | A non-account node, here the synthetic recruiter |
| Device | `Device` | A handset id, not a customer |

Relationship types to show: `SENT`, `CONTROLS`, `USES_DEVICE`.

Caption properties (the hover card):

- On every `TwinEntity`: `name`, `account_id`, `kind`, `segment`, `role`, `opened_on`, `city`, `device_id`, `kyc_narrative`, `case_label`
- On `WatchlistWallet` also show `list_name` and `list_reason`
- On `SENT`: `txn_id`, `amount_hkd`, `booked_at`, `channel`, `memo`
- On `CONTROLS` and `USES_DEVICE`: `note`

`case_label` is a crosswalk to a course script in `data/cases/`. Hover it and say the name. Do not read it as a finding about a real investigation. `kyc_narrative` is a note stored on the synthetic customer file.

`planted_typology` is not on the graph. The answer key stays in the CSV and behind the Streamlit facilitator toggle.

## Base styles (use these while the class is looking)

Style by `kind`, so the picture does not give away `role` before the searches:

| Rule | Color | Caption |
| --- | --- | --- |
| `kind` is `wallet` | Purple `#6D28D9` | Wallet, including the mixer pool |
| `kind` is `person` | Rose `#9F1239` | Recruiter node. The edge is `CONTROLS`, not a payment |
| `kind` is `device` | Stone `#57534E` | Shared handset |
| `kind` is `bank_account` | Slate `#64748B` | Ordinary account color until a search highlights a path |

`SENT` in slate, with the amount on the caption. `CONTROLS` and `USES_DEVICE` dashed, rose.

## Optional facilitator styles (turn on after the searches)

These use `role` and `case_label`, which are stored attributes. They are not what the search queries compute.

| Rule | Color |
| --- | --- |
| `role` is `collector` | Orange `#C2410C` |
| `role` is `smurf` | Amber `#EA580C` |
| `role` is `cycle` | Teal `#0F766E` |
| `role` is `mule` | Orange `#C2410C` |
| `role` is `victim` | Blue `#1D4ED8` |
| `case_label` contains `deepfake` | Magenta `#BE185D` |
| `role` is `trade_cover` | Grey-blue `#475569` |

Say this out loud when you switch them on: the color now repeats the label the scenario author stored. The search phrases below are the structural questions.

## Search phrases to save

Paste the Cypher from `stories.cypher`. Bloom can store a search phrase as Cypher in current Bloom builds. If the Bloom build only accepts a plain search box, run the query in Browser and choose the result to show in Bloom.

1. **Smurfing fan-in.** Query 1. On the bundled week the only hub is `SYN-SM-HUB` (Ivan Tsang), eight payers, HKD 62,900, all on 3 March 2026. Each slice is under the starting line of HKD 10,000.
2. **Circular flow.** Query 2. The loop is `SYN-CY-A` → `SYN-CY-B` → `SYN-CY-C` → `SYN-CY-D` → back to `SYN-CY-A`. Browser returns that loop once per starting node. It is one story.
3. **Paths into the mixer.** Query 3. Follow `SENT` hops that end at `SYN-MIX-01`. You should be able to hover `SYN-DF-01` (Kai Mensah) and read the video-KYC note, then keep walking to `SYN-MU-L2`, `SYN-MU-L3`, and the purple wallet. Also hover `SYN-MU-L1` (Lee Kwan) and the `CONTROLS` edge from `SYN-CTRL-01`.

## What to point at while hovering

- **Smurfing.** Eight `SENT` arrows into one account, amounts between HKD 6,200 and HKD 9,400, plus dashed `USES_DEVICE` edges into `DEV-SMURF-7`. Smurfing here means many payments kept under a line. The line in this demo is the classroom dial, not a statute.
- **Circular flow.** Four `SENT` arrows in a loop. Memos say consulting and loan. No merchant sits on the loop. The narrative label `triad-cashflow-001` points at the course script about flows with no commercial purpose.
- **Mule to mixer.** A mule account moves someone else's funds onward. A mixer, in this ledger, is the watchlist wallet that pools the last hop. The path is the story. The video-KYC sentence on `SYN-DF-01` is the deepfake theme from `deepfake-hk-001` (liveness failed twice, then passed). The note rides along. It does not, by itself, select the path.

## What to say if someone asks whether this is the bank

This graph is the classroom twin: a controlled ledger for testing detection logic. It is not a live core-banking feed, and it is not the in-browser 3D Simulation Center. The Unity Editor project is only on branch `unity` and is outside the current demo path.
