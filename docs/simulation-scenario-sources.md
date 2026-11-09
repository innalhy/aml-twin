# AML simulation sources and assumptions

The bank-account investigation simulation uses one versioned, server-only synthetic fixture family in `workers/api/src/aml-simulation-data.ts`. It is separate authored content within the existing AML session engine; it is not bank data or a connection to a financial institution. The original thirteen case-library scripts are unchanged.

## Source register

| Reference | What informs the simulation | What the source does not validate |
| --- | --- | --- |
| [HKMA guidance on transaction monitoring, screening and suspicious transaction reporting, revised February 2023](https://brdr.hkma.gov.hk/eng/doc-ldg/docId/getPdf/20230209-3-EN/20230209-3-EN.pdf) | Institution-specific monitoring, customer context, enquiries, documented findings and decisions, data quality and calibration. | The fixture's particular numeric thresholds, customer records, response times or outcome labels. |
| [HKMA effective execution of risk-based CDD, 8 February 2024](https://brdr.hkma.gov.hk/eng/doc-ldg/docId/getPdf/20240208-3-EN/20240208-3-EN.pdf) | Proportionate information requests, use of existing records, customer impact and risk-sensitive judgement. | A rule that every rapid outflow or incomplete document requires an identical restriction. |
| [JFIU SAFE approach](https://www.jfiu.gov.hk/en/str.html) | Screen indicators, ask appropriate questions, find existing records and evaluate the combined information. | A reporting decision based on one indicator or an automatic legal conclusion from an authored variant. |

These official sources were consulted on 2 November 2026. Their inclusion is a design reference, not regulatory approval or practitioner validation. Review the owning sources when updating scenario policy.

## Pinned authored versions

- Dataset: `mule-investigation-1.0`.
- Practice controls: `training-controls-1.0`.
- Reasoning rubric: `evidence-reasoning-1.0`.
- Validation status: **unvalidated**. Practitioner review and an unseen-case pilot remain outstanding.

The server selects one of three variants: contradictory evidence, corroborated explanation, or unresolved enquiries. Names, identifiers, customer history, opening transactions, initial documents, request titles and request delays are identical across variants. Variant identity and the later response bodies must stay out of learner API responses until their respective release gates; the authored context stays hidden until the exercise ends. Initial records alone intentionally do not reveal which explanation later evidence will support.

## Ledger contract

The start snapshot is 2 November 2026 at 10:00 HKT (`2026-11-02T02:00:00Z`). All API transaction timestamps are UTC. The internal account opened on 14 October and has HKD 8,000 carried forward before the listed transaction history. Posted history reconciles as:

`8,000 + 24,000 - 9,000 - 5,000 + 620,000 - 250,000 - 260,000 = 128,000 HKD`.

`openingBalanceHkd` means the posted **start-of-exercise** balance of HKD 128,000, after those historical transactions. The engine must not debit historical rows a second time. Pending CHATS instructions of HKD 50,000 and HKD 60,000 are due at minutes 12 and 22. They do not reduce that start balance until execution. If both execute once, the remaining balance is HKD 18,000. An account restriction cannot undo the two historical outflows, which are completed FPS transfers in this fixture.

The unusually large receipt and rapid outgoing transfers generate a monitoring lead using the existing classroom rapid-fan-out rule. They do not establish crime. The profile also records occasional event-procurement work, creating a plausible explanation that requires appropriate corroboration.

## Timing and control assumptions

Reading pauses the guided simulation clock. A customer enquiry takes six simulated minutes, independent project verification takes nine, payment-channel review takes four, and qualified conversion-path analysis takes ten. Some checks depend on obtaining an earlier record. These fixed times are educational scheduling parameters, not service-level evidence from a bank.

An analyst recommendation is distinct from reviewer approval and operational application. Applying an approved hold or release takes two simulated minutes under this exercise's policy. Only instructions still pending can be affected. Simulated role switching enables a learner to practise both sides of a handoff; it must not be described as an independent reviewer assessment.

The conversion-path response describes only information a bank could receive through a qualified provider and supplied records. Each variant states attribution limits. The exercise grants no omniscient view into another bank, wallet ownership or an exchange's private account records.

## Validation work still required

Have at least two AML practitioners independently examine the evidence and proposed response rubric without seeing the authored variant label first. Preserve their disagreements, rationale and any changes to the scenario. Then pilot the revised version with learners and assess performance on genuinely unseen cases. Local software tests can establish timing, disclosure and balance consistency; they cannot establish real-world calibration or learning transfer.
