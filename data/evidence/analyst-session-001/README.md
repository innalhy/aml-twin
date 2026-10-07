# TwinAML analyst evidence pack

This pack supplies two complete synthetic investigation dossiers and four background alerts for learners to examine. It contains 6 customer profiles, 24 account records, 126 transfers, 6 alerts, and 24 evidence documents. Twelve documents are available initially; twelve are released after requested checks. Customer profiles and ledger rows contain no scenario outcome labels.

## Files and audience

| Folder or file | Audience | Purpose |
| --- | --- | --- |
| learner/START.md | Learner | Exercise briefing and case-note template |
| learner/customers.json | Learner | Declared profiles and expected activity |
| learner/accounts.csv | Learner | Account holders and balance baselines |
| learner/transactions.csv | Learner | 122 completed transfers and 4 pending orders |
| learner/alerts.csv | Learner | Two paired alerts and four background alerts |
| learner/evidence-index.csv and records/ | Learner | Twelve initially available records |
| learner/request-catalog.csv | Learner | Twelve request options, their delays, and prerequisites |
| learner/course-policy.md | Learner | Fictional classroom investigation policy |
| instructor/answer-key.md and answer-key.json | Instructor | Hidden scenario facts, expected reasoning, and rubric |
| instructor/evidence-index.csv and release/ | Instructor | Release gates and twelve further responses |
| instructor/events.csv | Instructor or simulator author | Four pending-order due events |

The paired dossiers cover the existing deepfake-001 narrative and a new legitimate project-payment lookalike. The latter is authored evidence content, not an additional script in the existing eleven-case library. All names, IDs, watchlist entries, institutions, and amounts are fictional. SCU is a scenario unit with no real currency or jurisdiction implied. The KYC material consists of text observations and transcripts; no video or validated detector output is included.

## Share with learners

Share only learner/ initially. The case classification, answers, release responses, and timing controls stay in instructor/. Instructors supply individual response documents when their requests complete. Keep the top-level pack README outside the learner bundle because it describes the pairing.

For a web player, the server must select the permitted records for the current run. Do not expose this entire pack as static frontend assets. The existing twin remains the single state owner; these files are source evidence and authored event inputs, not a second state machine or event log. No HTTP release endpoint is implemented here.

## Interpret the ledger

Each CSV transaction is one transfer, not a pair of duplicated debit and credit rows. Debit the source and credit the target only for executed rows. Pending rows do not affect the opening balance or executed balance. Internal accounts have an opening_balance_at; external accounts have no supplied balance baseline. The snapshot is 2026-04-15T11:12:00Z. All dates are UTC.

Both target accounts receive 480000 SCU and schedule payments of 230000 and 240000 SCU. Initial balances are therefore 480000 SCU each. Both orders executing leaves 10000 SCU. The ledger names and references are neutral; corroborating documents distinguish payment purpose.

The monitoring alert threshold and timing rules are fictional teaching assumptions. The existing deepfake script is unchanged: its transaction burst is already displayed before its final decision. The pack’s pending-order timing is an explicit extension for an investigation exercise, not a claim that the original script can prevent a past transfer.

## Validate

From the repository root:

```bash
python3 scripts/validate-evidence.py
node scripts/validate-cases.mjs
```

The evidence check validates record links, request prerequisites, chronological account balances, matched payment amounts, due-event times, and the separation between initial records and instructor responses. The case check verifies the existing script contract and original deepfake paths.

## Extend the content

Author a new scenario’s underlying story first, then its customer profile, payment chain, documents, contradictions or corroboration, and request timing. Add routine history that fits the declared activity. Keep the hidden scenario outcome in the instructor key. Use the same document layout, fields, and service times across contrasting cases so formatting does not disclose the answer. Add a new case only when its claims, independent responses, and ledger reconcile.

The next content families can use the existing mule-account and trade-based scripts. Each needs its own detailed evidence and a contrasting explanation; random transaction rows alone do not supply an investigation.
