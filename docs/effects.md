# Effect keys (schema 0.1)

This page freezes how a future twin state machine applies `twin_patch` and `choices[].effects` for script schema `0.1`. The JSON Schema in [`packages/schemas/script.schema.json`](../packages/schemas/script.schema.json) still types both objects as open patches. This document is the apply convention for the keys those patches use.

Inventory below covers every example script in [`data/cases/`](../data/cases/README.md):

- `01-deepfake-hk-001.example.json`
- the ten `hk-*.example.json` files

The machine is not built in this slice. P1-S2 implements the rules on this page. Rules in `rules[].when` stay human-readable sentences. This applier does not parse them.

## Apply order

A session has one twin. Patches accumulate on it.

1. **Clone.** Deep-clone `initial_twin_state` into the session twin. Later steps write that clone. They do not clone the initial object again, and they do not mutate the script file.
2. **Enter a node.** If the node has `twin_patch`, apply it.
3. **Branch on node type.**
   - `scene`: the node has `next`. After the patch, enter that node. The player may show the scene first. The twin does not wait for a choice.
   - `decision`: wait for one `choice_id`. Apply that choice's `effects` (skip when the object is absent). Then enter `choice.next`.
   - `outcome`: `terminal` is `true`. Stop after the patch. The session disposition is the string that patch wrote to `disposition`.
4. **Same node, both objects.** Apply `twin_patch` first, then `effects`. No decision in these eleven files has a `twin_patch`. The order still holds if a later script adds one.

```text
twin = deepClone(script.initial_twin_state)
node = nodeById(script.start_node_id)
loop:
  apply(twin, node.twin_patch)
  if node.type == "outcome": stop
  if node.type == "scene": node = nodeById(node.next); continue
  if node.type == "decision":
    apply(twin, chosen.effects)
    node = nodeById(chosen.next)
    continue
```

`JSON.parse(JSON.stringify(initial_twin_state))` is a sufficient clone. Twin values are JSON data.

Apply the keys of one patch in object order (the order they appear in the file).

## Key grammar

A key is a path. Split on `.`. `kyc.status` writes `twin.kyc.status`. It does not create a property whose name is the literal string `kyc.status`.

Every segment except the last must already be a plain object on the twin. If it is missing, the apply fails as a script error. Do not invent a new top-level branch.

The last segment picks the operation:

| Last segment | Target | Operation |
| --- | --- | --- |
| `flags_add` | same path with the last segment replaced by `flags` | Append. The value is an array of strings. The target is already an array. Push each string that is not already present. Keep the existing order, then the new flags in array order. |
| `score_delta` | same path with the last segment replaced by `score` | Add. The value is a finite number. The target is already a number. `score = score + delta`. Do not clamp. |
| anything else | the path itself | Replace. Store the JSON value as-is (string, number, boolean, `null`, array, or object). If the leaf is missing and the parent object exists, create the leaf. Arrays and objects replace the leaf wholesale. There is no deep merge. |

Only two special last segments exist in these files: `flags_add` (always `risk.flags_add`) and `score_delta` (always `risk.score_delta`). A different `*_add` or `*_delta` key is not defined. The validator rejects it.

`risk.flags_add` therefore appends onto `risk.flags`. `risk.score_delta` adds to `risk.score`. Both targets exist on every example script (`flags: []`, `score` a number).

### Replace, including holds and transactions

`account.holds` has no special suffix, so the array **replaces** `account.holds`.

- `["outbound"]`, `["limit_increase"]`, and `["outbound", "limit_increase"]` are the full hold list after that choice.
- `[]` clears holds. Used by `hk-wiseword-amlmonth-001` (`n_r2_gate` / `release`) and `hk-triad-cashflow-001` (`n_r1_gate` / `accept_cash`).

`transactions` is a top-level key. The array replaces `transactions`. A script that must keep earlier rows repeats them in the new array. `hk-mule-rent-001` does this: `initial_twin_state.transactions` holds `TX-MR-0`, and the `n_credits` patch writes `TX-MR-0` plus the later credits.

### One leaf that starts missing

`deepfake-hk-001` choice `edd_hold` sets `account.holds` to `["outbound"]`. `initial_twin_state.account` on that script has `opened` only. The parent object `account` exists, so the replace creates `account.holds`. Every other dotted path in the eleven files already exists on `initial_twin_state`.

## Choice effect keys

These ten keys appear on `choices[].effects`. Counts are uses across the eleven files.

| Key | Uses | Value | Apply |
| --- | --- | --- | --- |
| `account.holds` | 25 | string array, or `[]` | Replace `account.holds`. |
| `account.opened` | 2 | `true` | Replace `account.opened`. `deepfake-hk-001` only (`pass_video`, `override_r1`). |
| `account.transfer_limit` | 2 | `"raised"` or `"standard"` | Replace. `hk-hkma-cdd-001` only. |
| `controls.pep_screening` | 1 | `"rerun_ordered"` | Replace. `hk-ia-fwd-controls-001` `n_r2_gate` / `remediate`. |
| `controls.str_worksheet` | 2 | `"escalated"` or `"str_drafted"` | Replace. `hk-ia-fwd-controls-001` only. |
| `kyc.status` | 20 | string | Replace `kyc.status`. All eleven cases. |
| `monitoring.status` | 1 | `"restored"` | Replace. `hk-hkma-cdd-001` `n_r2_gate` / `do_both`. |
| `premium.accepted` | 5 | boolean | Replace. `hk-ia-fwd-controls-001` only. |
| `risk.flags_add` | 95 | string array | Append onto `risk.flags`. All eleven cases. |
| `risk.score_delta` | 22 | number `20`, `25`, `30`, `35`, or `40` | Add to `risk.score`. All eleven cases. |

`kyc.status` strings written by choices in these files: `blocked_by_rule`, `cdd_waived`, `edd_ordered`, `exit_started`, `explanation_requested`, `interview_open`, `passed`, `passed_by_override`, `payer_check_open`, `refresh_ordered`, `rejected`, `retry_requested`, `sof_requested`. The machine stores the string. It does not keep an enum.

## Twin patch keys

These keys appear on `twin_patch`. Scenes and outcomes carry patches in these files (33 scene patches, 45 outcome patches). Decision nodes do not.

| Key | Uses | Value | Apply |
| --- | --- | --- | --- |
| `phase` | 65 | string | Replace top-level `phase`. |
| `disposition` | 45 | string | Replace top-level `disposition`. Outcome nodes only. |
| `transactions` | 9 | array of transaction objects | Replace the whole array. |
| `risk.flags_add` | 28 | string array | Append onto `risk.flags`. All eleven cases. |
| `kyc.status` | 9 | string | Replace. |
| `kyc.liveness_failures` | 1 | number `2` | Replace. `deepfake-hk-001` `n_liveness_retry`. |
| `kyc.account_control` | 1 | `"third_party"` | Replace. `hk-mule-rent-001`. |
| `kyc.address_proof` | 1 | `"stale"` | Replace. `hk-hkma-cdd-001`. |
| `kyc.beneficial_owner` | 1 | `"missing"` | Replace. `hk-daybreak-tbml-001`. |
| `kyc.business_evidence` | 1 | `"missing"` | Replace. `hk-kol-mgmt-001`. |
| `kyc.commercial_evidence` | 1 | `"missing"` | Replace. `hk-triad-cashflow-001`. |
| `kyc.source_of_funds` | 1 | `"friend_fx_unsupported"` | Replace. `hk-justicegate-crypto-001`. |
| `monitoring.status` | 1 | `"switched_off"` | Replace. `hk-hkma-cdd-001`. |
| `monitoring.alerts_over_threshold` | 1 | number `4` | Replace. `hk-hkma-cdd-001`. |
| `controls.pep_screening` | 1 | `"missing"` | Replace. `hk-ia-fwd-controls-001`. |
| `controls.str_worksheet` | 1 | `"open_unowned"` | Replace. `hk-ia-fwd-controls-001`. |
| `premium.payer_relation` | 1 | `"unverified_third_party"` | Replace. `hk-ia-fwd-controls-001`. |
| `corridor.contract_evidence` | 1 | `"missing"` | Replace. `hk-crossborder-tel-001`. |
| `trade.shipment_evidence` | 1 | `"missing"` | Replace. `hk-daybreak-tbml-001`. |

`kyc.status` strings written by scene patches in these files: `evidence_failed`, `liveness_failed`, `payer_unverified`, `rental_admitted`, `single_story`, `sof_failed`, `still_incomplete`, `story_recorded`. Same rule as choice effects: store the string.

`phase` values written by these patches: `alert_triage`, `cdd_review`, `closed`, `cluster_review`, `control_review`, `corridor_review`, `kyc_review`, `monitoring_review`, `premium_review`, `purpose_review`, `source_review`. Outcome patches set `phase` to `closed`.

### Disposition

Outcome `twin_patch` objects write `disposition`. Choice effects in these files do not. The machine stores that string. It does not derive disposition from the choice id or from `rules[].when`.

Strings used:

| `disposition` | Where the teaching lists live |
| --- | --- |
| `onboarding_rejected`, `blocked_by_rule`, `str_drafted`, `edd_hold`, `false_positive_cleared` | `deepfake-hk-001` |
| `str_drafted`, `freeze_recommended`, `edd_hold`, `account_exit`, `relationship_exit`, `policy_exit`, `control_remediation`, `cdd_refreshed_and_str`, `exit_without_str`, `false_positive_cleared`, `monitoring_backdated` | the ten `hk-*` scripts |

Meanings for the `hk-*` strings are in [`data/cases/README.md`](../data/cases/README.md). `teaching.acceptable_dispositions`, `teaching.poor_dispositions`, and (on `hk-triad-cashflow-001` only) `teaching.incomplete_dispositions` classify the stored string for the dashboard. The applier does not rewrite it.

An override stays on the twin as a flag, usually `R1_OVERRIDDEN` via `risk.flags_add`. The rule object stays in the script.

## Flags appended by `risk.flags_add`

These are values, not keys. The machine appends them onto `risk.flags` and does not special-case the spelling.

From choice effects:

`BOOKED_AS_BRAND`, `CASH_LABEL_ACCEPTED`, `CDD_REFRESH`, `CDD_RESTRICTED`, `CDD_WAIVED`, `CLUSTER_WAIVED`, `CONTROL_REMEDIATION`, `CORRIDOR_WAIVED`, `EDD_HOLD`, `EDD_ORDERED`, `EXIT_WITHOUT_STR`, `FREEZE_RECOMMENDED`, `KYC_SIGNALS_WAIVED`, `LIMIT_RAISED`, `MONITORING_BACKDATED`, `MONITORING_RESTORED`, `NETWORK_VIEW`, `ONBOARDING_REJECTED`, `PAYER_CHECK`, `POLICY_EXIT`, `POST_DISMISSED`, `PREMIUM_BOOKED_EARLY`, `PREMIUM_HELD`, `PREMIUM_REJECTED`, `R1_BLOCK`, `R1_OVERRIDDEN`, `R2_IGNORED`, `RELATIONSHIP_EXIT`, `SOF_SKIPPED`, `STR_DRAFTED`, `TYPOLOGY_SPLIT`

From `twin_patch`:

`ALERTS_UNREPORTED`, `CASH_AND_OTC`, `CDD_INCOMPLETE`, `FAST_OUT`, `FRAUD_MIX`, `FRAUD_PROCEEDS`, `FRONT_PROFILE`, `MONITORING_OFF`, `MULE_CLUSTER`, `MULTI_TYPOLOGY`, `NO_BUSINESS_RECORD`, `NO_COMMERCIAL_PURPOSE`, `NO_COMMISSION_CONTRACT`, `NO_INVOICE`, `NO_SOURCE`, `OC_PROCEEDS_INDICATOR`, `PASS_THROUGH`, `PAYEE_FANOUT`, `PEP_GAP`, `PHONE_FRAUD_INDICATOR`, `RENTAL_ADMITTED`, `RENTAL_POST`, `STORY_DOES_NOT_COVER`, `STR_WORKSHEET_OPEN`, `THIRD_PARTY_BURST`, `THIRD_PARTY_CONTROL`, `THIRD_PARTY_PREMIUM`, `TRADE_DOC_GAP`, `UNKNOWN_PAYERS`, `VOLUME_VS_SALARY`

## Check the files

From the repo root:

```bash
node scripts/validate-cases.mjs
```

The script checks each `data/cases/*.example.json` file against `packages/schemas/script.schema.json`, checks that `start_node_id` and every `next` point at a node, and checks that every patch key follows the grammar above against that file's `initial_twin_state`. It then runs [`scripts/deepfake-paths.test.mjs`](../scripts/deepfake-paths.test.mjs), which clones `initial_twin_state` and plays all eight terminal paths of `deepfake-hk-001`. That file can also be run on its own. The state machine is still P1-S2. If `ajv` is not already installed, the script installs `ajv@8` under the OS temp directory. It does not add a dependency to this repo. GitHub Actions runs the same command on push and pull request (`.github/workflows/cases.yml`).

The Unity training room applies this same order in the Editor for two topics. The choice lists are checked by [`scripts/unity-room-paths.test.mjs`](../scripts/unity-room-paths.test.mjs). See [`unity/UNITY.md`](../unity/UNITY.md). That room does not add effect keys.
