# 5. Cross-border phone-fraud corridors

This page is for human review. The playable script is [`data/cases/07-crossborder-tel-001.example.json`](../cases/07-crossborder-tel-001.example.json). Its `case_id` is `hk-crossborder-tel-001`. The public-reporting note is in [`data/cases/README.md`](../cases/README.md).

## Real-world flow

Method and logic: a criminal group uses a cross-border remittance corridor, such as a Hong Kong company paying Mainland personal accounts. Nominal commission or a fee paid for a customer is the cover. Phone-fraud proceeds are fanned out quickly to many unrelated personal accounts.

```mermaid
flowchart TD
  fan["A Hong Kong company account pays large amounts to dozens of Mainland personal accounts in a short time"]
  label["The stated purpose is commission or a service fee"]
  mismatch["Bank compliance or a correspondent indicator shows the payees are not on the supplier list in the file"]
  nocontract["There is no real commercial contract, and the payees are not connected to each other"]
  corridor["The funds are a fan-out channel for cross-border phone-fraud proceeds"]
  cash["The money is then split and withdrawn, which cuts the enforcement trail"]
  fan --> label --> mismatch --> nocontract --> corridor --> cash
```

The public-reporting note for `hk-crossborder-tel-001` is the inspiration. It is not the customer file inside the script.

## Platform teaching flow

Trainee role: cross-border compliance officer, or a transaction-monitoring analyst.

Training goal: recognise a large set of personal payees with no contract, and a phone-fraud corridor indicator. Do not close the case on an oral story that the firm was paying a fee for a customer, or paying commission.

```mermaid
flowchart TD
  show["The system shows a corporate customer making frequent fan-out payments to many Mainland personal accounts"]
  file["The file has no commission contract, and a correspondent fraud-typology indicator has fired"]
  choice{"Trainee decision"}
  accept["A. Accept the oral fee or commission story and close the case: high risk, wrong handling"]
  edd["B. Stop outbound payments and run enhanced due diligence on the corridor: correct handling"]
  report["C. Recommend a freeze, draft a suspicious transaction report, or exit the relationship: correct handling"]
  closed["If the oral story is accepted, the fan-out is cleared while it continues"]
  held["If payments are stopped or the case is reported, the corridor is not cleared on the oral story"]
  show --> file --> choice
  choice --> accept --> closed
  choice --> edd --> held
  choice --> report --> held
```

The check is whether the trainee holds the line when the indicators are already on the file, and refuses a passive close.
