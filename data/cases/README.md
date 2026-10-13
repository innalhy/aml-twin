# Case scripts

Synthetic training scripts for the TwinAML demo. Each file is a Chan Level 1 case: `schema_version` `0.1`, validated against [`packages/schemas/script.schema.json`](../../packages/schemas/script.schema.json).

`initial_twin_state` is the mirror. `nodes` are the script (`scene`, `decision`, `outcome`). `rules[].when` is a sentence for a person to read until a state machine exists. `effects` and `twin_patch` are patches. How the future machine applies them is frozen in [`docs/effects.md`](../../docs/effects.md). Rules decide the compliance outcome (rules-before-AI). A human override is an event: the scripts mark it with a flag such as `R1_OVERRIDDEN` instead of deleting the rule.

The trainee role in every script is a fictional Hong Kong financial-institution AML or compliance officer. Decisions are customer due diligence, enhanced due diligence, a draft suspicious transaction report, an outbound hold or freeze recommendation, relationship or policy exit, or control remediation. The scripts do not simulate police raids.

Identifiers are synthetic (`SYN-` customers, accounts, policies, and counterparties). Prompt amounts are scenario figures for teaching. They are not the public-case totals.

## Disclaimer

These files are synthetic training scenarios. The ten `public_record_inspired` scripts are inspired by public enforcement reporting. They are not official case files and they do not contain real customer data. Do not treat a script, a `SYN-` identifier, or a disposition as a record of a real person, account, or investigation.

`deepfake-hk-001` is the original course example. It is synthetic as well, and it is not drawn from a public enforcement brief.

## Index

Titles below are short English labels. Files are numbered `01`–`11` in this order. The JSON `title` and prompts are Traditional Chinese, matching `01-deepfake-hk-001.example.json`. `case_id` is unchanged.

| File | case_id | Themes | case_kind |
| --- | --- | --- | --- |
| [01-deepfake-hk-001.example.json](01-deepfake-hk-001.example.json) | `deepfake-hk-001` | Video-KYC deepfake signals, third-party burst, OTC crypto | Course example (no `case_kind`; Chan Level 1 worked example) |
| [02-daybreak-tbml-001.example.json](02-daybreak-tbml-001.example.json) | `hk-daybreak-tbml-001` | Trade-based money laundering, shell company, fake jewellery or diamond exports, third-party payers | `public_record_inspired` |
| [03-mule-rent-001.example.json](03-mule-rent-001.example.json) | `hk-mule-rent-001` | Social-media account rental sold as safe or legal, third-party control | `public_record_inspired` |
| [04-wiseword-amlmonth-001.example.json](04-wiseword-amlmonth-001.example.json) | `hk-wiseword-amlmonth-001` | One mule account, several typologies (job, romance, shopping, gambling) | `public_record_inspired` |
| [05-justicegate-crypto-001.example.json](05-justicegate-crypto-001.example.json) | `hk-justicegate-crypto-001` | Cash withdrawal and crypto OTC cash-out, source of funds | `public_record_inspired` |
| [06-greythunder-mule-001.example.json](06-greythunder-mule-001.example.json) | `hk-greythunder-mule-001` | Mule cluster, fake-official and investment-fraud proceeds | `public_record_inspired` |
| [07-crossborder-tel-001.example.json](07-crossborder-tel-001.example.json) | `hk-crossborder-tel-001` | Cross-border phone-fraud corridor, correspondent awareness, fan-out payments | `public_record_inspired` |
| [08-kol-mgmt-001.example.json](08-kol-mgmt-001.example.json) | `hk-kol-mgmt-001` | KOL or influencer management company as a front | `public_record_inspired` |
| [09-triad-cashflow-001.example.json](09-triad-cashflow-001.example.json) | `hk-triad-cashflow-001` | Flows with no commercial purpose, organised-crime proceeds indicator | `public_record_inspired` |
| [10-ia-fwd-controls-001.example.json](10-ia-fwd-controls-001.example.json) | `hk-ia-fwd-controls-001` | Insurer controls: third-party premium, PEP screening, STR worksheet | `public_record_inspired` |
| [11-hkma-cdd-001.example.json](11-hkma-cdd-001.example.json) | `hk-hkma-cdd-001` | Bank CDD, ongoing monitoring, STR failures | `public_record_inspired` |

## Public reporting context

Facts in this table are the public-reporting notes the scripts were inspired by. They are not the customer, account, or amount inside the playable script. Source URLs appear only where the course brief supplied one. Labels without a URL are names from that brief. This page does not invent `police.gov.hk` links.

| case_id | Public context used as inspiration | Source |
| --- | --- | --- |
| `deepfake-hk-001` | None. Original synthetic course script. | — |
| `hk-daybreak-tbml-001` | Hong Kong Customs, January 2024: trade-based money laundering, about HK$14 billion, seven arrests, about HK$165 million frozen; India app-fraud proceeds described as fake jewellery or diamond export receipts into Hong Kong companies. | [Customs press release](https://www.customs.gov.hk/en/customs-announcement/press-release/index_id_4080.html) |
| `hk-mule-rent-001` | HK Police, April 2025, operation on account rental (謀攻): 503 arrests, 404 fraud or cyber cases. The course brief did not include a URL. | HK Police press, April 2025 operation on account rental (URL not in the course brief) |
| `hk-wiseword-amlmonth-001` | HK Police, August 2023, WISEWORD: 458 arrests, 314 money-laundering-related cases, proceeds above HK$470 million, about HK$16 million stopped before dispersal. The course brief did not include a URL. | HK Police press, August 2023 WISEWORD (URL not in the course brief) |
| `hk-justicegate-crypto-001` | JUSTICEGATE: October 2022–June 2023, at least 48 accounts, about HK$111 million, seven arrests in August 2023 for conspiracy to launder. The course brief did not include a URL. | HK enforcement briefing, JUSTICEGATE (URL not in the course brief) |
| `hk-greythunder-mule-001` | GREYTHUNDER: May–November 2022, at least 33 accounts, about HK$175 million, HK$28 million linked to at least 27 cases, six arrests in July 2023. The course brief did not include a URL. | HK enforcement briefing, GREYTHUNDER (URL not in the course brief) |
| `hk-crossborder-tel-001` | April–June 2023 cross-border phone fraud: 320 Mainland accounts, 2,900 Mainland phone frauds, about HK$460 million, IRONSPLITTER-related context. The course brief did not include a URL. | HK Police context, April–June 2023 (URL not in the course brief) |
| `hk-kol-mgmt-001` | Two KOL management companies, 46 accounts, HK$560 million, of which HK$60 million from 66 phone, investment, or romance frauds. The course brief did not include a URL. | HK enforcement briefing on KOL management company accounts (URL not in the course brief) |
| `hk-triad-cashflow-001` | 25 local accounts, about HK$210 million in suspicious proceeds, joint OCST investigation context. The course brief did not include a URL. | Public reporting on organised-crime cashflow through local accounts (URL not in the course brief) |
| `hk-ia-fwd-controls-001` | Insurance Authority fine of HK$19.5 million for insurer AML control failures; review period April 2012–September 2024. The script uses a fictional insurer and a synthetic policy. | [Insurance Business Asia](https://www.insurancebusinessmag.com/asia/news/life-insurance/hong-kong-aml-fine-puts-broker-and-insurer-controls-under-scrutiny-591045.aspx) |
| `hk-hkma-cdd-001` | HKMA penalties on four banks in November 2021, HK$44.2 million in total, for AMLO control failures (CDD, ongoing monitoring, STRs). The script uses a fictional bank file. | [Clifford Chance briefing (PDF)](https://www.cliffordchance.com/content/dam/cliffordchance/briefings/2021/11/hkma-penalises-four-banks-hk$44.2-million-for-money-laundering-control-failures-key-takeaways.pdf) |

Each `public_record_inspired` file sets `teaching.rules_before_ai` to `true`, `teaching.case_kind` to `public_record_inspired`, plus `teaching.disclaimer`, `teaching.themes`, and `teaching.sources`. `teaching.sources[].url` is present only for the three rows that have a URL in the table above.

## Dispositions

`teaching.acceptable_dispositions` and `teaching.poor_dispositions` on each file are the contract for that script. `hk-triad-cashflow-001` also lists `teaching.incomplete_dispositions`: drafting an STR without a freeze recommendation does not clear `R2_OC_INDICATOR`.

Terminal `disposition` values used by the new scripts:

| Disposition | Meaning in these scripts |
| --- | --- |
| `str_drafted` | Suspicious transaction report drafted |
| `freeze_recommended` | Outbound hold plus a freeze recommendation, with an STR drafted |
| `edd_hold` | Enhanced due diligence with outbound payments held |
| `account_exit` | Relationship exited |
| `relationship_exit` | Relationship exited at onboarding or CDD (`hk-hkma-cdd-001`) |
| `policy_exit` | Third-party premium refused (`hk-ia-fwd-controls-001`) |
| `control_remediation` | PEP screening rerun and STR worksheet escalated |
| `cdd_refreshed_and_str` | CDD refresh, monitoring restored, and STR drafted |
| `exit_without_str` | Relationship exited while a report was still required (poor) |
| `false_positive_cleared` | Cleared against a rule that forbids clearance (poor) |
| `monitoring_backdated` | Alerts marked reviewed after the fact (poor) |

`deepfake-hk-001` is unchanged. Its terminal values remain `onboarding_rejected`, `blocked_by_rule`, `str_drafted`, `edd_hold`, and `false_positive_cleared`.
