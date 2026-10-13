# 4. Trade-based money laundering

This page is for human review. The playable script is [`data/cases/02-daybreak-tbml-001.example.json`](../cases/02-daybreak-tbml-001.example.json). Its `case_id` is `hk-daybreak-tbml-001`. The public-reporting note is in [`data/cases/README.md`](../cases/README.md).

## Real-world flow

Method and logic: a criminal group uses international trade as cover. Goods are overpriced or invented, and the invoice does not match the shipping papers. Illegal funds cross a border as if they were trade payments.

```mermaid
flowchart TD
  shell["A shell company or trader files import or export papers, for example a claimed jewellery or diamond trade"]
  mismatch["The declared corridor or the goods value does not match the size of the firm"]
  third["The payment comes from someone who is not the buyer on the invoice"]
  noship["There is no bill of lading, customs record, or stock record for a real shipment"]
  split["The same day the money arrives, it is split to personal or overseas accounts that have nothing to do with the trade"]
  clean["The funds have moved across a border. On the surface it looks like ordinary commerce"]
  shell --> mismatch --> third --> noship --> split --> clean
```

In public reporting, this method uses shell companies to create a large false trade flow and to get around exchange controls and compliance review. Hong Kong Customs reporting on jewellery-trade laundering is the inspiration for `hk-daybreak-tbml-001`. It is not the customer file inside the script.

## Platform teaching flow

Trainee role: trade-finance officer, or a corporate compliance reviewer.

Training goal: see the gaps in the papers, including missing shipment evidence and a third-party payer. Do not treat those gaps as documents still in transit, or as an ordinary commercial delay.

```mermaid
flowchart TD
  review["The trainee reviews the firm's jewellery-export account and the transactions"]
  gaps["Two risks: no shipment evidence, and the buyer, seller, and payer do not match"]
  choice{"Trainee decision"}
  release["A. Accept documents in transit and release the payment: high risk, wrong handling"]
  edd["B. Order enhanced due diligence and stop outbound payments: correct handling"]
  str["C. Draft a suspicious transaction report, or recommend exiting the relationship: correct handling"]
  alert["If the payment is released, the later split triggers a breach alert"]
  held["If the case is held for review or reported, the outbound payment is not released on the trade file"]
  review --> gaps --> choice
  choice --> release --> alert
  choice --> edd --> held
  choice --> str --> held
```

After a release, the check is whether the trainee followed the rules in the script. A later oral explanation is not that check.
