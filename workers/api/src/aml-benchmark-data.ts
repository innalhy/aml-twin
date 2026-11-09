import type { AmlAccount, AmlEntity, AmlEvidence, AmlRelationship, AmlTransaction, BenchmarkAnswer, BenchmarkScenario } from "../../../packages/aml/types";

// Only the backend imports this module. Every record and outcome is authored training data.
export const AML_BENCHMARK_VERSION = "rapid-outflow-five-v1";
export const AML_BENCHMARK_AS_OF = "2026-11-01T04:00:00Z";

function entity(id: string, name: string, kind: AmlEntity["kind"], business: string, sourceOfFunds: string, expectedMonthlyHkd: number): AmlEntity {
  return { id, name, kind, aliases: [], jurisdiction: "Hong Kong", identifier: `SYNTHETIC-${id}`, address: `Fictional benchmark address ${id}`, business, sourceOfFunds, expectedMonthlyHkd, risk: "medium" };
}

const entities: AmlEntity[] = [
  entity("BM-E01", "Eli Wong", "person", "Warehouse coordinator", "Declared monthly salary; no collection-agent business declared", 28000),
  entity("BM-E02", "Brook Event Services Limited", "company", "Event production and supplier coordination", "Project advances covering supplier budgets and retained fees", 500000),
  entity("BM-E03", "Nora Lau", "person", "Retail assistant", "Declared monthly salary; no supplier-settlement business declared", 26000),
  entity("BM-E04", "Alder Production Limited", "company", "Event installation and supplier coordination", "Contractual project advances and installation fees", 450000),
  entity("BM-E05", "Ian Leung", "person", "Salaried technical designer", "Monthly employer payroll", 38000),
  entity("BM-E01-IN", "Vale Project Payments Limited", "company", "Customer-declared project payments", "Purpose supplied in the payment reference", 0),
  entity("BM-E01-OUT", "Cove Settlement Limited", "company", "Customer-declared equipment settlement", "Purpose supplied by the customer", 0),
  entity("BM-E02-IN", "Willow Exhibitions Limited", "company", "Exhibition organiser", "Operating business receipts", 0),
  entity("BM-E02-OUT", "Fern Equipment Limited", "company", "Event equipment rental", "Equipment rental receipts", 0),
  entity("BM-E03-IN", "Maple Project Payments Limited", "company", "Customer-declared project payments", "Purpose supplied in the payment reference", 0),
  entity("BM-E03-OUT", "Stone Equipment Limited", "company", "Customer-declared equipment settlement", "Purpose supplied by the customer", 0),
  entity("BM-E04-IN", "Hazel Conferences Limited", "company", "Conference organiser", "Operating business receipts", 0),
  entity("BM-E04-OUT", "Pine Installation Limited", "company", "Event installation supplier", "Installation contract receipts", 0),
  entity("BM-E05-IN", "Reed Design Limited", "company", "Design employer", "Operating business receipts", 0),
  entity("BM-E05-OUT", "Fictional Household Payments", "company", "Aggregated household-payment counterparty", "Routine household spending; training aggregate", 0),
];

function account(id: string, entityId: string, internal: boolean, openedAt: string): AmlAccount {
  return { id, entityId, internal, openedAt, bank: internal ? "Harbour Training Bank (fictional)" : "External institution (fictional)", jurisdiction: "Hong Kong", currency: "HKD" };
}

const accounts: AmlAccount[] = [
  ...["01", "02", "03", "04", "05"].map((n) => account(`BM-A${n}`, `BM-E${n}`, true, n === "05" ? "2025-05-01T00:00:00Z" : "2026-10-25T00:00:00Z")),
  ...["01", "02", "03", "04", "05"].flatMap((n) => [account(`BM-X${n}-IN`, `BM-E${n}-IN`, false, "2024-01-01T00:00:00Z"), account(`BM-X${n}-OUT`, `BM-E${n}-OUT`, false, "2024-01-01T00:00:00Z")]),
];

function tx(id: string, at: string, fromAccount: string, toAccount: string, amount: number, reference: string): AmlTransaction {
  return { id, at, fromAccount, toAccount, amount, currency: "HKD", hkdAmount: amount, channel: "CHATS", status: "executed", reference };
}

const transactions: AmlTransaction[] = [
  tx("BM-T01-IN", "2026-11-01T01:00:00Z", "BM-X01-IN", "BM-A01", 120000, "Project advance REF-101"),
  tx("BM-T01-OUT", "2026-11-01T01:14:00Z", "BM-A01", "BM-X01-OUT", 117600, "Equipment payment REF-101"),
  tx("BM-T02-IN", "2026-11-01T01:00:00Z", "BM-X02-IN", "BM-A02", 120000, "Project advance REF-102"),
  tx("BM-T02-OUT", "2026-11-01T01:22:00Z", "BM-A02", "BM-X02-OUT", 112800, "Equipment payment REF-102"),
  tx("BM-T03-IN", "2026-11-01T01:00:00Z", "BM-X03-IN", "BM-A03", 120000, "Project advance REF-103"),
  tx("BM-T03-OUT", "2026-11-01T01:45:00Z", "BM-A03", "BM-X03-OUT", 108000, "Equipment payment REF-103"),
  tx("BM-T04-IN", "2026-11-01T01:00:00Z", "BM-X04-IN", "BM-A04", 120000, "Project advance REF-104"),
  tx("BM-T04-OUT", "2026-11-01T01:45:00Z", "BM-A04", "BM-X04-OUT", 108000, "Equipment payment REF-104"),
  tx("BM-T05-IN", "2026-11-01T01:00:00Z", "BM-X05-IN", "BM-A05", 38000, "October payroll REF-105"),
  tx("BM-T05-OUT", "2026-11-01T03:00:00Z", "BM-A05", "BM-X05-OUT", 9000, "Household payment REF-105"),
];

const evidence: AmlEvidence[] = [
  { id: "BM-D01", entityIds: ["BM-E01", "BM-E01-IN", "BM-E01-OUT"], title: "Onboarding and project enquiry REF-101", source: "Authored bank CDD file and independent-contact exercise record", body: "Eli Wong declared warehouse employment and expected monthly salary credits of HKD 28,000. The customer describes the HKD 120,000 receipt as a project advance and the HKD 117,600 payment as equipment settlement. No collection mandate or invoice was supplied. The purported project contact, reached through an independently verified route, could not confirm the customer's authority or the supplier relationship. The payment reference alone does not establish its purpose. Record what remains unexplained and what further checks are needed; the available evidence is not a legal finding." },
  { id: "BM-D02", entityIds: ["BM-E02", "BM-E02-IN", "BM-E02-OUT"], title: "Project budget and supplier reconciliation REF-102", source: "Authored contracts, invoices and independent verification log", body: "Brook Event Services receives gross project advances rather than treating the entire receipt as retained revenue. A signed mandate and project budget reconcile the HKD 120,000 receipt to a HKD 112,800 equipment invoice and HKD 7,200 retained fee. The organiser and equipment supplier independently confirmed the mandate, invoice and payment details through the bank's recorded verified contact routes. Assess the numeric alert alongside this corroboration." },
  { id: "BM-D03", entityIds: ["BM-E03", "BM-E03-IN", "BM-E03-OUT"], title: "Onboarding and project enquiry REF-103", source: "Authored bank CDD file and independent-contact exercise record", body: "Nora Lau declared retail employment and monthly income of HKD 26,000. The customer describes the HKD 120,000 credit as a project advance and the HKD 108,000 payment as equipment settlement. The supplied invoice contains a project identifier that the named organiser could not verify through an independent contact route. The customer could not provide authority to collect or settle funds for that project. Compare the declared activity, transfer timing and supporting records; account age or amount alone does not establish wrongdoing." },
  { id: "BM-D04", entityIds: ["BM-E04", "BM-E04-IN", "BM-E04-OUT"], title: "Project budget and supplier reconciliation REF-104", source: "Authored contracts, invoices and independent verification log", body: "Alder Production's declared business includes receiving advances and paying installation suppliers. A signed project mandate reconciles the HKD 120,000 receipt with a HKD 108,000 supplier invoice and HKD 12,000 retained project fee. The conference organiser and installation supplier independently confirmed the authority, commercial purpose and payment amounts through recorded verified contacts. The payment occurred 45 minutes after receipt. Consider this evidence when deciding how to handle a monitoring match." },
  { id: "BM-D05", entityIds: ["BM-E05", "BM-E05-IN", "BM-E05-OUT"], title: "Payroll and expenditure checks REF-105", source: "Authored payslip, employer verification and household-payment records", body: "Ian Leung's declared employer and salary align with the HKD 38,000 payroll receipt. The employer independently confirmed the payroll reference. The later HKD 9,000 payment corresponds to documented household expenses. The account has been open since May 2025. Assess only the supplied episode; this record does not establish the character of all future activity." },
];

const scenarios: BenchmarkScenario[] = ["01", "02", "03", "04", "05"].map((n) => ({
  id: `BM${n}`, title: `Account activity ${n}`, accountId: `BM-A${n}`, transactionIds: [`BM-T${n}-IN`, `BM-T${n}-OUT`], evidenceIds: [`BM-D${n}`],
}));

export const AML_BENCHMARK_DATA: { entities: AmlEntity[]; accounts: AmlAccount[]; transactions: AmlTransaction[]; relationships: AmlRelationship[]; evidence: AmlEvidence[]; scenarios: BenchmarkScenario[] } = {
  entities, accounts, transactions, relationships: [], evidence, scenarios,
};

// Synthetic scenario truth is revealed only in the debrief, never inferred from an alert or an STR.
export const AML_BENCHMARK_ANSWERS: BenchmarkAnswer[] = [
  { scenarioId: "BM01", category: "suspicious", rationale: "The author seeded a mule-like episode: HKD 120,000 enters a new salary account and 98% leaves within 14 minutes, with no corroborated collection authority or supplier relationship. This is synthetic scenario ground truth, not proof of a real offence or an automatic instruction to file an STR." },
  { scenarioId: "BM02", category: "legitimate", rationale: "The author seeded a legitimate project-payment lookalike: a verified mandate and invoice account for the HKD 120,000 advance, HKD 112,800 supplier payment and HKD 7,200 fee. The numeric pattern is a rapid outflow of 94% within 22 minutes. A numeric alert on this episode is a false positive against the scenario label, although investigation can still be reasonable." },
  { scenarioId: "BM03", category: "suspicious", rationale: "The author seeded a slower mule-like episode: 90% of HKD 120,000 leaves a new salary account after 45 minutes and the claimed commercial purpose lacks corroboration. The timing is designed to test the effect of changing the monitoring window. The label is an authored training answer, not a legal conclusion derived from transfer timing." },
  { scenarioId: "BM04", category: "legitimate", rationale: "The author seeded a legitimate project payout: independently checked authority, a HKD 108,000 supplier invoice and a HKD 12,000 fee reconcile the HKD 120,000 receipt. Payment occurs after 45 minutes. A rule that matches this episode creates legitimate activity to investigate." },
  { scenarioId: "BM05", category: "legitimate", rationale: "The author seeded routine salary and household spending supported by employer and expenditure records. The episode consists of a HKD 38,000 salary credit and a HKD 9,000 household payment two hours later, on an account opened in May 2025. Compare these facts with the recorded rule settings. An absence of alerts on this episode does not imply universal safety for the customer." },
];
