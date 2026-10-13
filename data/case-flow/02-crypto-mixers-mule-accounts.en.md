# 2. Crypto mixers and mule accounts

This page is for human review. Nearby playable scripts in `data/cases/` are `mule-rent-001`, `wiseword-amlmonth-001`, `greythunder-mule-001`, and `justicegate-crypto-001`. The decision node on this page is this teaching flow. It is not a line-by-line map of those scripts.

## Real-world flow

The method has two stages. Mule accounts move the victim's funds through layers. A crypto mixer then breaks the direct on-chain link. The aim is to make it harder to connect the original fraud proceeds to the offender.

```mermaid
flowchart TD
  victim["Victim is deceived into transferring funds"]
  layer1["Funds enter a first-layer mule account"]
  layer23["The holder or controller quickly sends them to a second or third layer"]
  cashout["Funds are withdrawn, used to buy crypto, or sent to an overseas account"]
  deposit["The offender deposits the crypto into a mixer"]
  mix["The mixer splits and mixes funds from many users"]
  payout["The offender receives an equivalent amount, after fees, at a new anonymous address"]
  break["The direct on-chain link is broken, so the source is hard to read straight off the chain"]
  victim --> layer1 --> layer23 --> cashout --> deposit --> mix --> payout --> break
```

## Platform teaching flow

Trainee role: bank AML analyst, or compliance officer at a crypto exchange.

Training goal: weigh several red flags together, then choose enhanced due diligence, a stop on the transaction, or a draft suspicious transaction report.

```mermaid
flowchart TD
  account["The system shows the account: a sudden large credit, then transfers to many accounts or exchanges"]
  chain["On-chain material shows the funds ending at mixer-linked addresses"]
  choice{"Trainee decision"}
  clear["A. Close the case as a normal investment: high risk, red flags ignored"]
  edd["B. Ask for source-of-funds evidence: enhanced due diligence, outbound payments limited"]
  str["C. Draft a suspicious transaction report and recommend a freeze"]
  exit["D. Start an exit from the customer relationship"]
  feedback["The system checks whether the trainee saw that the flow does not match the customer, and the mixer link"]
  account --> chain --> choice
  choice --> clear --> feedback
  choice --> edd --> feedback
  choice --> str --> feedback
  choice --> exit --> feedback
```
