# 3. Synthetic identity fraud

This page is for human review. None of the eleven playable scripts is a synthetic-identity file. This page is the teaching flow for onboarding and credit.

## Real-world flow

Method and logic: a real identifier that has been stolen is combined with invented details to build a person who does not exist. The sequence is to assemble the identity, inflate the credit record, draw down the credit, and cash it out.

```mermaid
flowchart TD
  makeup["Assemble the identity: a real identity number with a false name, address, and phone"]
  pump["Inflate the credit file: manufactured repayment history, and a picture of steady income and a good score"]
  apply["Apply for a card, a personal loan, or a bank account in that identity"]
  runup["In a short time, spend, overdraw, borrow, or buy assets that can be resold"]
  cash["Fake spending through a sham or complicit merchant turns the credit line into merchant funds, or the funds are withdrawn in cash"]
  default["Repayment stops and the identity disappears. The person does not exist, so the firm bears the loss"]
  makeup --> pump --> apply --> runup --> cash --> default
```

## Platform teaching flow

Trainee role: KYC reviewer, or an onboarding and credit reviewer.

Training goal: at onboarding and at a credit application, see contradictions in the file, an abnormal credit trail, and a complicit-merchant pattern.

```mermaid
flowchart TD
  file["The trainee receives an account or card application from the synthetic-identity customer"]
  evidence["The trainee can open identity documents, the credit report, the address, the device address, and linked accounts"]
  flags["Red flags: the identity number does not match the name, or the credit file shows a sudden manufactured rise"]
  choice{"Trainee decision"}
  approve["A. Approve the account and the credit limit: high risk, the fraud is missed"]
  edd["B. Ask for proof of a physical address and a further identity check: enhanced due diligence"]
  reject["C. Refuse the account, mark a possible synthetic identity, and report it to internal compliance"]
  bust["If approved, that identity later draws down the credit and then defaults and disappears"]
  held["If refused or sent to enhanced review, the account or credit does not open as applied for"]
  file --> evidence --> flags --> choice
  choice --> approve --> bust
  choice --> edd --> held
  choice --> reject --> held
```

## Training matrix for the first three cases

| Case | Trainee role | Decision question | What is marked |
| --- | --- | --- | --- |
| Deepfake executive impersonation | Finance officer or payment approver | Is this a real authorisation, or pressure from a fake senior officer? | Whether an independent channel was used, and whether dual authorisation was followed |
| Mule accounts and a crypto mixer | Bank AML analyst or exchange compliance officer | Does the flow match the customer, and is the mixer activity explained? | How many red flags were seen, and whether the trainee chose enhanced due diligence, a limit, or a suspicious transaction report |
| Synthetic identity fraud | KYC, onboarding, or credit reviewer | Is this a real customer, or an identity assembled from pieces? | Contradictions found, an abnormal credit trail, and a merchant cash-out pattern |
