# Case scripts

Synthetic training scripts for the TwinAML demo. Each file is a Chan Level 1 case: `schema_version` `0.1`, validated against [`packages/schemas/script.schema.json`](../../packages/schemas/script.schema.json).

The web case library at `/cases` plays these scripts; see the root README. `initial_twin_state` is the mirror. `nodes` are the script (`scene`, `decision`, `outcome`). `rules[].when` is a sentence for a person to read until a state machine exists. `effects` and `twin_patch` are patches. How the future machine applies them is frozen in [`docs/effects.md`](../../docs/effects.md). Rules decide the compliance outcome (rules-before-AI). A human override is an event: the scripts mark it with a flag such as `R1_OVERRIDDEN` instead of deleting the rule.

The trainee role in every script is a fictional financial-institution AML or compliance officer. Decisions are customer due diligence, enhanced due diligence, a draft suspicious transaction report, an outbound hold or freeze recommendation, relationship or policy exit, or control remediation. The scripts do not simulate police raids.

Identifiers are synthetic (`SYN-` customers, accounts, policies, and counterparties). Prompt amounts are scenario figures for teaching. They are not the public-case totals.

## Disclaimer

These files are synthetic training scenarios. The ten `public_record_inspired` scripts are inspired by public enforcement reporting. They are not official case files and they do not contain real customer data. Do not treat a script, a `SYN-` identifier, or a disposition as a record of a real person, account, or investigation.

`deepfake-001` is the original course example. It is synthetic as well, and it is not drawn from a public enforcement brief.

## Detailed investigation evidence

The [analyst evidence pack](../evidence/analyst-session-001/README.md) provides customer profiles, account and transaction tables, messages, invoice and contract records, KYC review logs, synthetic screening results, independent checks, and an instructor key. It pairs the deepfake narrative with a legitimate project-payment lookalike and includes four background alerts. Share only its `learner/` folder initially; the instructor controls the release of later evidence.

The legitimate lookalike is separate authored evidence content, not the existing `false_positive_cleared` branch. That disposition remains a poor outcome in `deepfake-001`. The eleven case scripts, their rules, and their effects are unchanged. The evidence pack's pending-order schedule is a timed extension; the original deepfake script displays its transaction burst before the final decision.

## Index

Titles below are short English labels. Files are numbered `01`–`11` in this order. Every script is English (`locale` `en`); the validator rejects any other locale or Chinese, Japanese or Korean text. The original Traditional Chinese text was translated in October 2026 without changing ids, rules, effects or dispositions. `case_id` is unchanged.

| File | case_id | Themes | case_kind |
| --- | --- | --- | --- |
| [01-deepfake-hk-001.example.json](01-deepfake-hk-001.example.json) | `deepfake-001` | Video-KYC deepfake signals, third-party burst, OTC crypto | Course example (no `case_kind`; Chan Level 1 worked example) |
| [02-daybreak-tbml-001.example.json](02-daybreak-tbml-001.example.json) | `daybreak-tbml-001` | Trade-based money laundering, shell company, fake jewellery or diamond exports, third-party payers | `public_record_inspired` |
| [03-mule-rent-001.example.json](03-mule-rent-001.example.json) | `mule-rent-001` | Social-media account rental sold as safe or legal, third-party control | `public_record_inspired` |
| [04-wiseword-amlmonth-001.example.json](04-wiseword-amlmonth-001.example.json) | `wiseword-amlmonth-001` | One mule account, several typologies (job, romance, shopping, gambling) | `public_record_inspired` |
| [05-justicegate-crypto-001.example.json](05-justicegate-crypto-001.example.json) | `justicegate-crypto-001` | Cash withdrawal and crypto OTC cash-out, source of funds | `public_record_inspired` |
| [06-greythunder-mule-001.example.json](06-greythunder-mule-001.example.json) | `greythunder-mule-001` | Mule cluster, fake-official and investment-fraud proceeds | `public_record_inspired` |
| [07-crossborder-tel-001.example.json](07-crossborder-tel-001.example.json) | `crossborder-tel-001` | Cross-border phone-fraud corridor, correspondent awareness, fan-out payments | `public_record_inspired` |
| [08-kol-mgmt-001.example.json](08-kol-mgmt-001.example.json) | `kol-mgmt-001` | KOL or influencer management company as a front | `public_record_inspired` |
| [09-triad-cashflow-001.example.json](09-triad-cashflow-001.example.json) | `triad-cashflow-001` | Flows with no commercial purpose, organised-crime proceeds indicator | `public_record_inspired` |
| [10-ia-fwd-controls-001.example.json](10-ia-fwd-controls-001.example.json) | `insurer-controls-001` | Insurer controls: third-party premium, PEP screening, STR worksheet | `public_record_inspired` |
| [11-hkma-cdd-001.example.json](11-hkma-cdd-001.example.json) | `bank-cdd-001` | Bank CDD, ongoing monitoring, STR failures | `public_record_inspired` |

## Public reporting context

The ten `public_record_inspired` scripts retain the AML typologies described in public enforcement reporting. Source labels remain in `teaching.sources`; location-specific URLs and public-case monetary totals are omitted from this demo.

Each file sets `teaching.rules_before_ai` to `true`, `teaching.case_kind` to `public_record_inspired`, plus `teaching.disclaimer`, `teaching.themes`, and `teaching.sources`.

## Scenario values

Case filenames and `case_id` values use location-neutral names. `SYN-` identifiers have no location prefix. Transaction and account-rental figures use `amount` in generic scenario units, with no real-world currency implied. Corridor labels describe cross-border or outbound flows. Rules, branches, numerical figures, and terminal dispositions are unchanged.

## Dispositions

`teaching.acceptable_dispositions` and `teaching.poor_dispositions` on each file are the contract for that script. `triad-cashflow-001` also lists `teaching.incomplete_dispositions`: drafting an STR without a freeze recommendation does not clear `R2_OC_INDICATOR`.

Terminal `disposition` values used by the new scripts:

| Disposition | Meaning in these scripts |
| --- | --- |
| `str_drafted` | Suspicious transaction report drafted |
| `freeze_recommended` | Outbound hold plus a freeze recommendation, with an STR drafted |
| `edd_hold` | Enhanced due diligence with outbound payments held |
| `account_exit` | Relationship exited |
| `relationship_exit` | Relationship exited at onboarding or CDD (`bank-cdd-001`) |
| `policy_exit` | Third-party premium refused (`insurer-controls-001`) |
| `control_remediation` | PEP screening rerun and STR worksheet escalated |
| `cdd_refreshed_and_str` | CDD refresh, monitoring restored, and STR drafted |
| `exit_without_str` | Relationship exited while a report was still required (poor) |
| `false_positive_cleared` | Cleared against a rule that forbids clearance (poor) |
| `monitoring_backdated` | Alerts marked reviewed after the fact (poor) |

`deepfake-001` keeps the original terminal values `onboarding_rejected`, `blocked_by_rule`, `str_drafted`, `edd_hold`, and `false_positive_cleared`.
