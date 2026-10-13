# 10. Organised-crime cashflow

This page is for human review. The playable script is [`data/cases/09-triad-cashflow-001.example.json`](../cases/09-triad-cashflow-001.example.json). Its `case_id` is `triad-cashflow-001`. The public-reporting note is in [`data/cases/README.md`](../cases/README.md).

## Real-world flow

Method and logic: an organised-crime network moves large amounts, at high frequency, through local company accounts. The accounts have no invoices, no commercial contracts, and no payroll. Counterparties are often individuals. When the bank asks, the story is a cash business or wholesale trade.

```mermaid
flowchart TD
  flow["A local company account shows many large movements in a short time"]
  blank["Counterparties are mostly individuals. The purpose field is blank. There are no invoices, contracts, or tax records"]
  cash["When questioned, the customer says this is only a cash business"]
  indicator["Internal monitoring or intelligence marks the set of flows as an organised-crime proceeds indicator"]
  out["The funds are then transferred or withdrawn. The movement and the washing of criminal proceeds are done"]
  flow --> blank --> cash --> indicator --> out
```

The public-reporting note for `triad-cashflow-001` is the inspiration. It is not the customer file inside the script.

## Platform teaching flow

Trainee role: senior compliance officer, or an AML investigator.

Training goal: an oral label of cash business is not evidence. When the internal typology marks organised-crime proceeds, drafting a report alone is incomplete. Outbound payments must be held, and a freeze must be recommended.

```mermaid
flowchart TD
  show["The system shows large movements on a company account, with no invoices and with individual counterparties"]
  choice1{"Decision 1"}
  pass["A. Accept the cash-business label and release: a poor start, wrong handling"]
  edd["B. Ask for invoices and contracts, or hold outbound payments first. Rule R1: enhanced due diligence and a stop on payments"]
  r2["The customer produces no commercial papers. The internal system then marks an organised-crime proceeds indicator. Rule R2 has fired"]
  choice2{"Decision 2"}
  close["A. Close it as an ordinary cash business: ignores R2, wrong handling"]
  draft["B. Draft a suspicious transaction report and do not stop payments: an incomplete exit"]
  freeze["C. Recommend a freeze and draft a suspicious transaction report: the complete exit that matches R2"]
  show --> choice1
  choice1 --> pass
  choice1 --> edd --> r2 --> choice2
  choice2 --> close
  choice2 --> draft
  choice2 --> freeze
```

On this script, drafting a report without a freeze recommendation does not clear `R2_OC_INDICATOR`. That incomplete exit is listed in [`data/cases/README.md`](../cases/README.md).
