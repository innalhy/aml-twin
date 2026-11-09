import type { AmlAccount, AmlEntity, AmlEvidence, AmlRelationship, AmlTransaction, MonitoringRule } from "../../../packages/aml/types";

// All identities, records and thresholds are authored training fixtures, not bank data or law.
export const AML_AS_OF = "2026-11-01T04:00:00Z";
export const MONITORING_LOOKBACK_DAYS = 7;
export const FX_RATES = { HKD: 1, USD: 7.8, RMB: 1.08 } as const;
export const INITIAL_RULE: MonitoringRule = { version: 1, minCreditHkd: 100000, minFanOutPercent: 80, windowMinutes: 30, newAccountDays: 30 };
export function hkdEquivalent(amount: number, currency: AmlTransaction["currency"]): number {
  return Math.round(amount * (currency === "USD" ? 780 : currency === "RMB" ? 108 : 100) / 100);
}

function entity(id: string, name: string, kind: AmlEntity["kind"], jurisdiction: string, business: string, sourceOfFunds: string, expectedMonthlyHkd: number, risk: AmlEntity["risk"] = "medium", aliases: string[] = []): AmlEntity {
  return { id, name, kind, aliases, jurisdiction, identifier: `SYNTHETIC-${id}`, address: `Fictional training address ${id}; ${jurisdiction}`, business, sourceOfFunds, expectedMonthlyHkd, risk };
}
export const AML_ENTITIES: AmlEntity[] = [
  entity("HK-C001", "Adrian Lam", "person", "Hong Kong", "Warehouse employee; declared salary HKD 25,000 monthly", "Salary from employer; no collection-agent business declared", 30000, "medium", ["Lam Adrian"]),
  entity("HK-C002", "Harbourline Event Projects Limited", "company", "Hong Kong", "Event production and supplier coordination", "Client project advances; gross receipts include supplier budgets, not only retained income", 1200000, "medium", ["Harbourline Events"]),
  entity("HK-C003", "Northbridge Components Trading Limited", "company", "Hong Kong", "Import/export of electronic components", "Sales receipts from overseas distributors; supplier payments in HKD, USD and RMB", 3000000, "medium", ["Northbridge Trading"]),
  entity("HK-C004", "Mei Ho", "person", "Hong Kong", "Salaried graphic designer", "Monthly payroll and occasional household reimbursements", 42000, "low", ["Ho Mei"]),
  entity("HK-C005", "Westfield Repair Services Limited", "company", "Hong Kong", "Device repairs and spare-parts purchases", "Local retail repair receipts", 150000, "low"),
  entity("HK-C006", "Priya Chan", "person", "Hong Kong", "Director and owner of Harbourline Event Projects Limited", "Director salary and dividends supported by company records", 80000, "medium", ["Chan Priya"]),
  entity("HK-E001", "Orchard Client Payments Limited", "company", "Hong Kong", "Corporate payment collection", "Customer-declared business receipts", 0),
  entity("HK-E002", "Lantern Settlement Services Limited", "company", "Hong Kong", "Customer-declared settlement services", "Not established in this bank's records", 0),
  entity("HK-E003", "Summit Event Equipment Limited", "company", "Hong Kong", "Event equipment rental", "Equipment rental sales", 0),
  entity("HK-E004", "Pearl River Components Limited", "company", "Mainland China", "Electronic components supplier", "Component sales", 0),
  entity("HK-E005", "Seabright Distribution Limited", "company", "Singapore", "Electronics distribution", "Trade sales", 0),
  entity("HK-E006", "Cedar Payroll Limited", "company", "Hong Kong", "Employer payroll account", "Operating business receipts", 0),
  entity("HK-E007", "Fictional Retail and Cash Clearing", "company", "Hong Kong", "Synthetic ledger counterparty for aggregated routine receipts", "Retail receipts; training aggregate", 0),
  entity("HK-E008", "Bay Stage Logistics Limited", "company", "Hong Kong", "Event logistics", "Logistics service sales", 0),
];

function account(id: string, entityId: string, internal: boolean, openedAt: string, currency = "HKD", jurisdiction = "Hong Kong"): AmlAccount {
  return { id, entityId, internal, openedAt, currency, jurisdiction, bank: internal ? "Harbour Training Bank (fictional)" : "External institution (fictional)" };
}
export const AML_ACCOUNTS: AmlAccount[] = [
  account("HK-A001", "HK-C001", true, "2026-10-31T01:00:00Z"),
  account("HK-A002", "HK-C002", true, "2026-10-28T01:00:00Z"),
  account("HK-A003", "HK-C003", true, "2026-10-20T01:00:00Z"),
  account("HK-A004", "HK-C004", true, "2025-05-01T01:00:00Z"),
  account("HK-A005", "HK-C005", true, "2024-08-01T01:00:00Z"),
  account("HK-A006", "HK-C006", true, "2023-09-01T01:00:00Z"),
  account("HK-X001", "HK-E001", false, "2024-01-01T00:00:00Z"),
  account("HK-X002", "HK-E002", false, "2024-01-01T00:00:00Z"),
  account("HK-X003", "HK-E003", false, "2024-01-01T00:00:00Z"),
  account("HK-X004", "HK-E004", false, "2024-01-01T00:00:00Z", "RMB", "Mainland China"),
  account("HK-X005", "HK-E005", false, "2024-01-01T00:00:00Z", "USD", "Singapore"),
  account("HK-X006", "HK-E006", false, "2024-01-01T00:00:00Z"),
  account("HK-X007", "HK-E007", false, "2024-01-01T00:00:00Z"),
  account("HK-X008", "HK-E008", false, "2024-01-01T00:00:00Z"),
];

function tx(id: string, at: string, fromAccount: string, toAccount: string, amount: number, currency: AmlTransaction["currency"], channel: AmlTransaction["channel"], reference: string, status: AmlTransaction["status"] = "executed"): AmlTransaction {
  return { id, at, fromAccount, toAccount, amount, currency, hkdAmount: hkdEquivalent(amount, currency), channel, reference, status };
}
export const AML_TRANSACTIONS: AmlTransaction[] = [
  tx("HK-T001", "2026-11-01T02:00:00Z", "HK-X001", "HK-A001", 500000, "HKD", "CHATS", "Project advance P-1101"),
  tx("HK-T002", "2026-11-01T02:08:00Z", "HK-A001", "HK-X002", 250000, "HKD", "FPS", "Equipment A"),
  tx("HK-T003", "2026-11-01T02:14:00Z", "HK-A001", "HK-X004", 240000, "HKD", "SWIFT", "Equipment B"),
  tx("HK-T004", "2026-11-01T02:20:00Z", "HK-A001", "HK-X002", 100000, "HKD", "CHATS", "Further settlement", "pending"),
  tx("HK-T005", "2026-11-01T01:00:00Z", "HK-X001", "HK-A002", 480000, "HKD", "CHATS", "Project budget EVT-24"),
  tx("HK-T006", "2026-11-01T01:10:00Z", "HK-A002", "HK-X003", 280000, "HKD", "FPS", "EVT-24 rental invoice"),
  tx("HK-T007", "2026-11-01T01:22:00Z", "HK-A002", "HK-X008", 170000, "HKD", "CHATS", "EVT-24 logistics invoice"),
  tx("HK-T008", "2026-10-30T02:00:00Z", "HK-X005", "HK-A003", 80000, "USD", "SWIFT", "Components purchase order NB-88"),
  tx("HK-T009", "2026-10-30T02:12:00Z", "HK-A003", "HK-X004", 350000, "HKD", "SWIFT", "NB-88 supplier part 1"),
  tx("HK-T010", "2026-10-30T02:24:00Z", "HK-A003", "HK-X005", 30000, "USD", "SWIFT", "NB-88 distributor adjustment"),
  tx("HK-T011", "2026-10-29T01:00:00Z", "HK-X006", "HK-A004", 38000, "HKD", "FPS", "October payroll"),
  tx("HK-T012", "2026-10-29T03:00:00Z", "HK-A004", "HK-X007", 9000, "HKD", "FPS", "Household expenses"),
  tx("HK-T013", "2026-10-28T02:00:00Z", "HK-X007", "HK-A005", 15000, "HKD", "Cash", "Weekly repair receipts"),
  tx("HK-T014", "2026-10-29T02:00:00Z", "HK-X007", "HK-A005", 12500, "HKD", "FPS", "Repair invoices WR-41 to WR-48"),
  tx("HK-T015", "2026-10-30T03:00:00Z", "HK-A005", "HK-X004", 10000, "RMB", "SWIFT", "Spare parts WR-49"),
  tx("HK-T016", "2026-10-27T03:00:00Z", "HK-A006", "HK-X007", 7500, "HKD", "FPS", "Household payment"),
  tx("HK-T017", "2026-10-30T01:00:00Z", "HK-A002", "HK-A006", 65000, "HKD", "FPS", "Director salary October"),
  tx("HK-T018", "2026-10-31T02:00:00Z", "HK-X007", "HK-A004", 2000, "HKD", "FPS", "Shared dinner reimbursement"),
  tx("HK-T019", "2026-10-25T00:00:00Z", "HK-X005", "HK-A003", 10000, "USD", "SWIFT", "Prior components sale NB-87"),
  tx("HK-T020", "2026-10-26T04:00:00Z", "HK-A003", "HK-X004", 40000, "RMB", "SWIFT", "NB-87 supplier payment"),
];

export const AML_RELATIONSHIPS: AmlRelationship[] = [
  { id: "HK-R001", fromEntity: "HK-C006", toEntity: "HK-C002", type: "Declared 100% owner and director", source: "HK-EV005: supplied ownership documents independently checked for this exercise", confirmed: true },
  { id: "HK-R002", fromEntity: "HK-C002", toEntity: "HK-E003", type: "Project supplier", source: "HK-EV003: verified rental contract and invoice", confirmed: true },
  { id: "HK-R003", fromEntity: "HK-C003", toEntity: "HK-E004", type: "Declared component supplier", source: "HK-EV004: customer-provided trade documents; receipt check remains outstanding", confirmed: false },
  { id: "HK-R004", fromEntity: "HK-C001", toEntity: "HK-E001", type: "Claimed collection mandate", source: "HK-EV002: customer claim disputed by independent contact", confirmed: false },
  { id: "HK-R005", fromEntity: "HK-C002", toEntity: "HK-E008", type: "Project logistics supplier", source: "HK-EV003: authorised project schedule and verification note", confirmed: true },
];

export const AML_EVIDENCE: AmlEvidence[] = [
  { id: "HK-EV001", entityIds: ["HK-C001"], title: "Individual onboarding and expected activity", source: "Fictional bank CDD file; customer supplied and bank verified identifiers", body: "All identifiers are synthetic. Adrian Lam declared warehouse employment and salary of HKD 25,000 monthly, with expected monthly credits of HKD 30,000. No payment-collection business or supplier settlement mandate was declared. A new high-value transfer needs explanation in context; account age and amount alone do not establish wrongdoing." },
  { id: "HK-EV002", entityIds: ["HK-C001", "HK-E001", "HK-E002"], title: "Project explanation and independent contact note", source: "Customer portal claim plus fictional bank's recorded independent customer-authority enquiry", body: "The customer says the HKD 500,000 is a project advance and outgoing payments buy equipment. No signed collection mandate was provided. Using an independently verified contact route recorded in the bank's file, the purported project contact could not confirm the mandate or the listed equipment suppliers. This synthetic response is an authorised enquiry result, not unrestricted access to another bank. The identity, source, purpose and recipient relationship remain unresolved. No legal conclusion is supplied." },
  { id: "HK-EV003", entityIds: ["HK-C002", "HK-C006", "HK-E001", "HK-E003", "HK-E008"], title: "Event budget, mandate and supplier reconciliation", source: "Customer contracts; bank verification log using previously verified project contacts", body: "Harbourline expects gross project budgets, distinct from director salary or retained fees. A signed collection mandate links Orchard Client Payments to project EVT-24. The budget shows HKD 480,000 received, HKD 280,000 equipment rental, HKD 170,000 logistics and HKD 30,000 retained fee. Independently contacted project and supplier representatives confirmed these references. Examine payment timing and all available evidence before recording a conclusion." },
  { id: "HK-EV004", entityIds: ["HK-C003", "HK-E004", "HK-E005"], title: "Trade invoice and shipping review", source: "Customer-supplied invoice, shipment record and relationship manager note", body: "Northbridge declares cross-border component trading with USD sale receipts and HKD/RMB supplier payments. NB-88 documents describe a USD 80,000 receipt, HKD 350,000 supplier instalment and USD 30,000 distributor adjustment. Invoice and shipment identifiers agree in the supplied records; independent confirmation of delivery and the adjustment's commercial basis has not yet been received. Cross-border flows alone do not establish suspicion. Customer documents are claims until corroborated." },
  { id: "HK-EV005", entityIds: ["HK-C006", "HK-C002"], title: "Company ownership and authority record", source: "Fictional bank CDD file, supplied ownership chart and authorised verification notes", body: "The bank's fictional CDD record identifies Priya Chan as Harbourline's 100% beneficial owner and director authorised to operate its account. The exercise supplies the evidence obtained by the bank; it does not imply that all significant-controller details are publicly searchable. The HKD 65,000 director salary is consistent with the declared payment purpose. Ownership is a relationship to investigate, not proof of wrongdoing." },
  { id: "HK-EV006", entityIds: ["HK-C004", "HK-C005"], title: "Routine activity and reimbursement checks", source: "Fictional bank account history, payroll reference and repair invoices", body: "Mei Ho's payroll reference and declared income align with the supplied salary receipt; the HKD 2,000 credit is documented as a shared-meal reimbursement. Westfield's repair receipts and spare-parts invoice correspond to its declared business. These records provide context, without guaranteeing that every future transaction is legitimate." },
  { id: "HK-EV007", entityIds: ["HK-C001", "HK-C002", "HK-C003", "HK-C004", "HK-C005", "HK-C006"], title: "Training data sources and fixed FX basis", source: "Authored simulation data dictionary; not a market quote or regulatory policy", body: "Snapshot: 1 November 2026, 12:00 HKT (04:00 UTC). Every person, company, institution, address and identifier is fictional. Amounts are whole currency units. Fixed illustrative conversion: HKD 1 = HKD 1; USD 1 = HKD 7.80; RMB 1 = HKD 1.08, rounded to a whole HKD. These are exercise rates, not current market rates. Monitoring uses executed transactions in the seven-day lookback only. FPS fixtures are completed transfers; an AML alert or internal STR recommendation does not undo them. Pending orders are excluded. Rule thresholds are training parameters, not legal reporting thresholds. Role switching is a training control, not authentication. Reports stay inside this simulation." },
];
