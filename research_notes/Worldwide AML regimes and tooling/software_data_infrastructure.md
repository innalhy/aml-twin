# AML Software, Data Infrastructure and Operating Model (worldwide, as of October 2026)

Research note scope: the bank-side AML technology stack (KYC/CRR, screening, transaction monitoring, case management, reporting), vendors and market position, the move from rules to ML / network analytics / GenAI, cross-institution data sharing, and how supervisors test and govern this software. Compiled 13 Oct 2026. Many search hits were secondary (law-firm, trade-press, vendor) summaries; this is flagged where it matters. Vendor statements are labelled **[vendor claim]**.

## 1. Functional components of the AML stack, how they connect, and alert/SAR/false-positive metrics

### Takeaway
The stack runs customer data → customer risk rating → name/payment screening and post-execution transaction monitoring → alerts → triage/investigation in case management → SAR/STR filing to the FIU. Its weakest point is often data plumbing rather than detection logic: the largest recent failures were transactions or list entries that never reached the monitoring or screening engine. The widely quoted figure that 90–95% of rules-based alerts are false positives is an industry rule of thumb. It traces to an untraced PwC analysis, and I found no peer-reviewed measure of alert-to-SAR conversion.

### Cited Findings
**Stack components and data flow**
- NYDFS Part 504 legally defines two of the core engines in New York: a **Transaction Monitoring Program** "reasonably designed for the purpose of monitoring transactions after their execution for potential BSA/AML violations and Suspicious Activity Reporting", and a separate (watch-list) **Filtering Program**. Both are covered by an annual board/senior-officer certification due 15 April. — [3 NYCRR 504.1 (Justia)](https://regulations.justia.com/states/new-york/title-3/chapter-iii/subchapter-c/part-504/section-504-1); [504.3](https://regulations.justia.com/states/new-york/title-3/chapter-iii/subchapter-c/part-504/section-504-3/); [Perficient, Jan 2026](https://blogs.perficient.com/2026/01/28/part-504-compliance-deadline-fast-approaching-for-bfsi-firms-in-new-york)
- The Wolfsberg Group's July 2024 *Statement on Effective Monitoring for Suspicious Activity* (Part I) says monitoring should go beyond transactions. Customer behaviour and attributes, combined with transactions, "can provide broader insights". It pushes banks to judge programmes by their value to law enforcement rather than alert volume. — [Wolfsberg Group](https://wolfsberg-group.org/resources/168); [Wolfsberg news](https://wolfsberg-group.org/news/the-wolfsberg-group-publishes-its-second-statement-on-effective-monitoring-for-suspicious-activity)
- HKMA (Sept 2024) describes AI-driven monitoring that looks past single transactions to a customer's risk profile and past transaction patterns. It says such systems "have proved to be more effective and efficient than conventional rules-based transaction monitoring". — [HKMA circular via Gibson Dunn](https://www.gibsondunn.com/hong-kong-monetary-authority-guidance-on-gen-ai-use-in-customer-facing-applications-and-use-of-ai-in-ml-tf/); [fintechnews.hk](https://fintechnews.hk/30807/ai/hkma-ai-adoption-aml-cft-monitoring/)

**Failure points in the data feeds (show where the components connect)**
- Metro Bank (FCA, Nov 2024, £16,675,200). From June 2016 to Dec 2020, a data-feed error meant transactions on the day an account was opened, and any later ones until the account record was updated, were never monitored. That was about 6% of volume: over 60 million transactions worth over £51bn. Junior staff raised concerns in 2017–2018 that went unresolved. A fix landed July 2019, but the bank could not verify that all relevant transactions reached the system until Dec 2020. Remediation produced 153 SARs. — [Foot Anstey](https://www.footanstey.com/our-insights/articles-news/enforcement-watch-fca-fines-metro-bank-16-7m-for-aml-transaction-monitoring-failings/); [Shoosmiths](https://www.shoosmiths.com/insights/articles/fca-fines-metro-bank)
- Starling Bank (FCA, Oct 2024, £28,959,426). A screening misconfiguration in place since 20 July 2017 meant customers were screened only against Consolidated List designated persons with UK citizenship or residency: 39 of 3,088 names. No individual-customer sanctions alerts were produced between 1 July 2022 and 30 Jan 2023. Starling also opened over 54,000 accounts for 49,000 high-risk customers in breach of a voluntary restriction. — [FCA press release](https://www.fca.org.uk/news/press-releases/fca-fines-starling-bank-failings-financial-crime-systems-and-controls); [Foot Anstey](https://www.footanstey.com/our-insights/articles-news/enforcement-watch-fca-fines-starling-bank-29m-for-aml-controls-failings-including-in-relation-to-sanctions-screening/)
- TD Bank (US, Oct 2024). The bank "intentionally did not automatically monitor all domestic ACH transactions, most check activity, and numerous other transaction types", leaving 92% of transaction volume (about $18.3 trillion) unmonitored from 1 Jan 2018 to 12 Apr 2024. Three laundering networks moved over $670m through the bank. Penalties: DOJ $1.8bn plus FinCEN $1.3bn (about $3bn in total), a $434bn asset cap and a four-year monitorship. — [Fintech Futures](https://www.fintechfutures.com/regulatory-actions/td-bank-hit-with-3bn-in-fines-over-aml-failures); [Axios](https://www.axios.com/2024/10/10/td-bank-money-laundering-charges-doj); [Latham & Watkins](https://lw.com/admin/upload/SiteAttachments/Landmark-Bank-Secrecy-Act-Resolution-Signals-Increasing-Focus-on-Banks-Anti-Money-Laundering-Compliance.pdf)

**Output volumes (the reporting end)**
- FinCEN received 4.3m SARs in FY2022, 4.6m in FY2023 and 4.7m in FY2024 (about 12,870 a day). The top 10 filers submitted about 45% of FY2024 SARs. — [FinCEN infographic 2025](https://www.fincen.gov/sites/default/files/shared/FinCEN-Infographic-Public-2025-508.pdf)
- Calendar-year counts of original SARs only are 3,801,691 (2024) and 3,809,823 (2023). The gap from the FY figures comes from counting amended and continuing-activity filings. — [Thomson Reuters Institute](https://www.thomsonreuters.com/en-us/posts/corporates/sars-report-2024)
- UK FIU received 872,048 SARs in 2023–24 and 866,616 in 2024–25 (down 0.6%). — [ZIGRAM summary of UKFIU 2024–25 report](https://www.zigram.tech/resources/uk-fiu-annual-report-2024-25/); [NCA SARs annual report annexes 2025](https://www.nationalcrimeagency.gov.uk/who-we-are/publications/785-sars-annual-report-annexes-2025/file). In an earlier year banks submitted 65.31% of UK SARs. — [Macfarlanes](https://www.macfarlanes.com/insights/102j4d8/suspicious-activity-reports-signs-of-quality-over-quantity)

**False-positive and alert-to-SAR rates (weak evidence base)**
- The 90–95% false-positive figure for rules-based TM is repeatedly attributed to "PwC analysis first cited around 2017–2018". The original PwC document could not be located. — [FluxForce statistics page](https://www.fluxforce.ai/statistics/false-positive-rates-transaction-monitoring) **[vendor content]**
- Typical alert-to-SAR conversion is put at 1–5%, and 8–15% for "well-tuned" programmes. FluxForce itself labels its range "illustrative". — [Particula](https://particula.tech/blog/aml-alert-triage-ai-false-positives); [FluxForce MLRO page](https://www.fluxforce.ai/for/mlro-sar-backlog) **[vendor content]**
- Definitions differ. Some sources count every generated alert, others only alerts that reach an analyst queue. That makes cross-source comparison unreliable. — [FluxForce](https://www.fluxforce.ai/statistics/false-positive-rates-transaction-monitoring)
- BIS (Project Aurora) gives macro context. Laundering is estimated at 2–5% of global GDP ($2–5 trillion a year), and seizures at under 1% of that. — [BIS othp66](https://www.bis.org/publ/othp66.htm)

### Inferences
- A typical end-to-end flow:
  1. Core banking, cards and payments feeds plus onboarding (KYC/CDD) data go into a customer master and **customer risk rating (CRR)**.
  2. **Name screening** (sanctions/PEP/adverse media at onboarding and on list updates) and real-time **payment screening** (pre-execution) run alongside post-execution **transaction monitoring** (scenarios/rules plus increasingly ML scores).
  3. Alerts are triaged at L1. L2/L3 investigation happens in **case management**.
  4. The SAR/STR is filed electronically with the national FIU, and the outcome feeds back into CRR.

  The Metro, Starling and TD cases all fail at the boundary between data and engine (feed coverage, list configuration, deliberate scope exclusions), not in scenario logic. This is why supervisors test data lineage and completeness. Useful framing for a digital twin.
- With US SARs at about 4.7m a year and UK at about 0.87m, and if 90–95% false-positive rates hold, banks are clearing tens of millions of alerts a year. This is the economic case for ML triage and GenAI copilots. The multiplier is an inference, not a measured figure.
- Because conversion figures come from vendors with an incentive to overstate the problem, the report should present "~90–95% FP / low single-digit % alert-to-SAR" as an industry heuristic, not a measured statistic.

### Gaps
- No peer-reviewed or regulator-published study of alert-to-SAR conversion was retrieved. Candidates not checked: FCA/UKFIU thematic reviews, ACAMS or Wolfsberg surveys, and academic work such as studies using the IBM AMLworld synthetic data.
- No primary source was retrieved for the separate CRR, adverse-media and payment-screening architecture. These descriptions rest on general practitioner knowledge and are not cited above.

## 2. Major vendors, market positions, analyst rankings and market size

### Takeaway
The market is a few incumbent enterprise suites (Oracle FCCM, NICE Actimize, SAS, FIS, Nasdaq Verafin, SymphonyAI NetReveal) with data and screening providers (Moody's, LSEG World-Check, Dow Jones) layered on top, plus fast-growing ML/graph specialists (Quantexa, Feedzai, Hawk, ThetaRay, Silent Eight, Lucinity, Napier, ComplyAdvantage). Chartis rankings in 2025–2026 put Moody's (data), Oracle (AML) and Feedzai (enterprise fraud) on top of their categories, with Quantexa rising. Estimates of the software market cluster at about US$2.5–4bn in 2025, growing 11–18% a year, depending on scope.

### Cited Findings
**Chartis RiskTech100 and category awards**
- RiskTech100 2025 overall top five: 1 Moody's, 2 SAS, 3 Oracle, 4 FIS, 5 Nasdaq. NICE Actimize ranked #14 and Quantexa #24. 2025 category winners:

  | Category | 2025 winner |
  |---|---|
  | Financial Crime: AML | Oracle |
  | Financial Crime: Data | Moody's |
  | Financial Crime: Enterprise Fraud | Feedzai |
  | Managed Services: Financial Crime | Nasdaq |
  | Trade-based AML | Eastnets |
  | Financial Crime Co-pilot | Lucinity |
  | Financial Crime Data Management | Xapien |
  | FRAML | Signicat |

  — [Chartis RiskTech100 winners](https://www.chartis-research.com/risk-tech100/winners); [RiskTech100 2025 report (Oracle-hosted)](https://www.oracle.com/a/ocom/docs/risk-tech100-2025.pdf)
- Moody's says it ranked #1 in RiskTech100 2026 for the fourth year running and won the Financial Crime: Data category. — [Moody's](https://www.moodys.com/web/en/us/kyc/resources/insights/moodys-winner-of-the-financial-crime-data-category-in-chartis-risktech100-2026-report.html) **[vendor-reported ranking]**
- RiskTech100 2026 placed AML specialists lower down: ComplyAdvantage #87, Napier AI #91, SmartKYC #93, Silent Eight #97, KYC360 #100. — [Quantifind press release (PR Newswire)](https://www.prnewswire.com/news-releases/quantifind-recognized-in-chartis-risktech100-2026-for-ai-precision-speed-and-scalabilityranking-above-well-known-financial-crime-and-compliance-vendors-302625147.html) **[vendor-reported]**
- Quantexa says (Sept 2026) that Chartis named it a Category Leader in the 2026 AML Transaction Monitoring quadrant, and that it placed 18th in RiskTech100 2027. — [GlobeNewswire 24 Sep 2026](https://www.globenewswire.com/news-release/2026/09/24/3368811/0/de/quantexa-erh%C3%A4lt-von-chartis-research-h%C3%B6chste-auszeichnungen-in-den-bereichen-aml-transaktions%C3%BCberwachung-und-im-rahmen-der-risktech100.html); [FinTech Magazine](https://fintechmagazine.com/globenewswire/3368353) **[vendor-reported]**. Chartis also runs a separate *Financial Crime and Compliance 50* ranking, which Quantexa says it topped in the inaugural edition. — [Quantexa](https://www.quantexa.com/press/quantexa-recognized-in-chartis-inaugural-financial-crime-and-compliance-50-rankings/); [Chartis FCC50 winners](https://www.chartis-research.com/financial-crime-and-compliance50/winners)

**Forrester and Celent**
- Forrester Wave: AML Solutions, Q2 2025 evaluated 15 providers on 18 criteria. Entry required a standalone AML product and at least $10m AML revenue. Named Leaders per vendor releases: SymphonyAI (cited for AI/ML risk scoring and out-of-the-box ACH and wire coverage), SAS (top marks in 10 of 18 criteria, current-offering score 4.40/5, second highest) and DataVisor. — [SymphonyAI](https://www.symphonyai.com/resources/leader-2025-forrester-wave-anti-money-laundering); [SAS](https://sas.com/en_in/news/press-releases/2025/april/forrester-wave-aml-solutions-leader.html); [DataVisor](https://www.datavisor.com/intelligence-center/reports/the-forrester-wave-anti-money-laundering-solutions-q2-2025) **[vendor-reported; full leader list not retrieved]**
- Celent's most recent AML TM vendor report found is 2023: Hawk AI won XCelent Technology; NICE Actimize won XCelent Functionality and Customer Base & Support; SymphonyAI Sensa-NetReveal was rated "Luminary". — [NICE Actimize Celent page](https://info.niceactimize.com/Celent_Awards_Report.html); [SymphonyAI](https://www.symphonyai.com/news/sensa-netreveal-luminary-2023-celent-aml-transaction-monitoring) **[vendor-hosted]**

**Consolidation**
- Visa completed its acquisition of Featurespace (real-time AI payments-protection, maker of ARIC) on 19 Dec 2024, to fold into Visa's fraud and risk-scoring products. The reported price of about £700m is unconfirmed. — [Visa investor relations](https://investor.visa.com/news/news-details/2024/Visa-Completes-Acquisition-of-Featurespace/default.aspx); [Business Wire](https://www.businesswire.com/news/home/20241218857122/en/Visa-Completes-Acquisition-of-Featurespace)
- Nasdaq bought Verafin for US$2.75bn (announced Nov 2020). Verafin is a cloud FRAML platform used by over 2,000 North American institutions, mostly community banks and credit unions. — [CNBC](https://www.cnbc.com/2020/11/19/nasdaq-to-buy-financial-fraud-detection-firm-verafin-for-2point75-billion.html); [Verafin](https://verafin.com/news/nasdaq-to-acquire-verafin-creating-a-global-leader-in-the-fight-against-financial-crime)
- 2026 tuck-in deals include SEALSQ/Wecan (June 2026) and Socure buying Fravity (agents for AML alert disposition) and Qlarifi. Socure's claimed 70% cut in false positives comes from an undisclosed deployment. — [Windsor Drake](https://windsordrake.com/market-intelligence/transactions/wecan-group-sealsq-2026); [BERI](https://www.beri.net/tag/Socure) **[single aggregator source; unverified]**

**Market size (definitions vary about threefold)**

| Source | Estimate |
|---|---|
| ResearchAndMarkets (Business Wire) | $4.1bn in 2025 → $14.75bn by 2034 (CAGR 15.3%) |
| MarketsandMarkets (wider AML market) | $4.13bn in 2025 → $9.38bn by 2030 (CAGR 17.8%) |
| IMARC | $2.8bn in 2024 → $8.2bn by 2033 (CAGR 12.6%) |
| LP Information | $1.43bn in 2025 |

  — [Business Wire](https://www.businesswire.com/news/home/20250723311835/en); [MarketsandMarkets via PR Newswire](https://tools.prnewswire.com/en-us/live/20823/release/20250530EN99577); [IMARC](https://www.imarcgroup.com/anti-money-laundering-software-market); [LP Information](https://markets.sharefair.com/en/detail/LP0912909489HE-Global-Anti-money-Laundering-Software-Market-Growth-Status-and-Outlook-2024-2030)
- A ResearchAndMarkets "industry forecast" lists NICE Actimize, TCS, Trulioo, ACI Worldwide and SAS among market leaders. — [GlobeNewswire Mar 2025](https://www.globenewswire.com/news-release/2025/03/06/3038299/28124/en/Anti-Money-Laundering-Industry-Forecast-2025-2029-2034-NICE-Actimize-Tata-Consultancy-Services-Trulioo-ACI-Worldwide-and-SAS-Institute-Lead-the-5-98-Billion-Market.html)

### Inferences
- Analyst positions suggest a three-way split:
  - **Incumbent suites** (Oracle, SAS, NICE Actimize, FIS, Nasdaq Verafin, SymphonyAI) win on breadth and installed base.
  - **Data and screening providers** (Moody's, LSEG, Dow Jones) dominate reference data for PEP, sanctions and adverse media.
  - **Specialists** (Quantexa for entity resolution and graph, Feedzai and Featurespace for real-time fraud/FRAML, Lucinity for copilots, Silent Eight for screening-alert adjudication, Hawk, ThetaRay, Napier, ComplyAdvantage, Tookitaki) win on ML and network analytics.
- Chartis created a "Financial Crime Co-pilot" category in 2025, and Lucinity won it. Analysts now treat GenAI investigator assistance as a separate product segment.
- A single 2025 market-size figure of "about US$2.5–4bn for AML software" is defensible. Higher numbers include services or fraud.

### Gaps
- No vendor product pages were fetched this session for: Oracle FCCM, NICE Actimize, SAS, FICO, Fenergo, Quantexa, Hawk, Napier, ComplyAdvantage, LSEG World-Check, Dow Jones, Feedzai, ThetaRay, Silent Eight, Lucinity, Tookitaki. Per-vendor capability descriptions (Fenergo = CLM/KYC onboarding; World-Check and Dow Jones = risk-intelligence data; Silent Eight = AI screening-alert adjudication; ThetaRay = unsupervised cross-border payment monitoring; Tookitaki = APAC community typology sharing) are background knowledge and should be verified before use.
- Crypto analytics (Chainalysis, Elliptic, TRM Labs): no sources retrieved. The only related item is the Elliptic2 Bitcoin subgraph dataset (NeurIPS 2023). — [IBM Research](https://research.ibm.com/publications/identifying-money-laundering-subgraphs-on-the-blockchain)
- The full Forrester Wave leader list, and any 2025–2026 Celent AML matrix, were not retrieved.
- The "Dow Jones/Moody's" pairing in the brief: no source tied them together. They are separate data providers.

## 3. UNODC goAML and how banks file reports in different countries

### Takeaway
goAML is UNODC's standard FIU software for receiving STRs/SARs, analysing them and disseminating intelligence. It is used by roughly 60 to over 70 countries (UNODC says "close to 60"; trade press said over 70 by May 2025). Large jurisdictions run their own national systems instead, such as FinCEN in the US and the NCA in the UK.

### Cited Findings
- UNODC's goAML 5.0 release says the system is deployed in close to 60 countries with more than 120,000 users. — [UNODC goPortfolio](https://unitego.un.org/goportfolio/node/746); [UNODC goAML portal](https://unitego.un.org/goaml/)
- A central-bank FIU page citing UNODC says more than 60 member states use goAML. — [Mongolbank FIU](https://fiu.mongolbank.mn/en/p/1600)
- AML Intelligence (May 2025) said more than 70 countries use goAML when Cuba adopted it for its FIU. — [AML Intelligence](https://www.amlintelligence.com/2025/05/news-cuba-adopts-undoc-goaml-system-for-fius/)
- Older vendor estimates put adoption at "more than 50" or "an estimated 50" nations using or evaluating it. — [Fenergo 2023](https://www.fenergo.com/blogs/why-goaml-is-changing-aml-and-sars); [Alessa](https://alessa.com/blog/goaml-reporting/) **[vendor content]**
- The US runs on FinCEN's own reporting: 4.7m SARs in FY2024. — [FinCEN infographic](https://www.fincen.gov/sites/default/files/shared/FinCEN-Infographic-Public-2025-508.pdf). The UK runs on the NCA UKFIU: about 866k SARs in 2024–25. — [NCA annexes 2025](https://www.nationalcrimeagency.gov.uk/who-we-are/publications/785-sars-annual-report-annexes-2025/file)

### Inferences
- In goAML countries a bank's case-management system must export filings in goAML's XML schema (or staff key them into the goAML web form). In the US the target is FinCEN's BSA E-Filing format; in the UK it is the NCA SAR Portal. So the "regulatory reporting" layer of a vendor suite is mostly per-jurisdiction format adapters.
- This bears on the TwinAML demo: a "file STR" decision can be modelled as producing a goAML-style report object.

### Gaps
- No official, dated UNODC count of goAML countries for 2026 was retrieved.
- No primary page was retrieved for FinCEN BSA E-Filing, the UK SAR Portal, Hong Kong JFIU STREAMS, Singapore STRO SONAR, or EU FIU-specific portals. The filing channels named in the Inferences are not cited.

## 4. Public-private and bank-to-bank data sharing (TMNL, COSMIC, FINEST, 314(b), JMLIT/ECCTA, EFIPPP, PETs/Aurora/Swift)

### Takeaway
Data sharing has moved from voluntary public-private partnerships (JMLIT, EFIPPP) to statutory bank-to-bank gateways:

| Gateway | Jurisdiction | Basis / start |
|---|---|---|
| 314(b) | US | Long-standing safe harbour |
| COSMIC | Singapore | 2024 |
| FINEST, statutory from 2025 | Hong Kong | 2023 pilot; legislation 2025 |
| ECCTA s.188/189 | UK | 2024 |
| AMLR Art. 75 | EU | from July 2027 |

The Dutch pooled-monitoring utility TMNL was wound down in 2024 because EU law did not allow suspicion-less joint monitoring. Privacy-enhancing technology pilots (BIS Aurora, Swift federated learning) report large detection gains on synthetic data only.

### Cited Findings
**Netherlands – TMNL**
- TMNL was the joint transaction-monitoring venture of ABN AMRO, ING, Rabobank, Triodos and de Volksbank, running since about 2020. — [banken.nl](https://www.banken.nl/nieuws/22486/vijf-nederlandse-banken-werken-samen-tegen-witwassen); [Fintech Futures](https://www.fintechfutures.com/bankingtech/major-dutch-banks-launch-aml-joint-venture)
- In Feb 2024 Brussels objected that TMNL did not fit the new EU AML package. In July 2024 the banks announced TMNL would wind down its existing activities and continue at a smaller scale; about 60 staff remained. The reason given: the new rules bar banks from jointly investigating customers without cause, which was TMNL's whole premise. — [banken.nl Feb 2024](https://www.banken.nl/nieuws/25106/brussel-zet-streep-door-huidige-opzet-transactiemonitoring-nederland); [banken.nl](https://www.banken.nl/nieuws/25387/transactiemonitoring-nederland-opnieuw-naar-de-tekentafel); [Accountant.nl Jul 2024](https://www.accountant.nl/nieuws/2024/7/banken-herzien-gezamenlijk-antiwitwasproject-om-nieuwe-wetgeving/)
- A privacy NGO reported that banks would stop outsourcing TM to TMNL but that the organisation "seems to continue to exist". — [HRIF.EU Jul 2024](https://hrif.eu/en/2024/07/hrifstopstmnl/). Earlier legal critique noted that DNB guidance says TM cannot be outsourced to third parties, and that joint investigations are permitted only under strict conditions. — [Mondaq](https://www.mondaq.com/money-laundering/1435046/joint-approach-to-money-laundering-by-dutch-banks-under-fire)
- **EU AMLR Article 75** (Regulation (EU) 2024/1624) applies from 10 July 2027. It creates the first EU legal basis for "partnerships for information sharing", limited to what is strictly necessary, to specific data categories, and to governance and data-protection safeguards. AMLA and the EDPB said on 1 July 2026 that they are jointly drafting guidelines, with consultation planned for H1 2027. — [Lucinity explainer](https://lucinity.com/blog/a-compliance-professionals-guide-to-amlr-article-75) **[vendor]**; [fintech.global Jun 2026](https://fintech.global/2026/06/12/gdpr-secrecy-laws-and-the-myths-stalling-aml-collaboration/). A BIS speech (2024) called Art. 75 narrower than US and Singapore sharing powers. — [BIS r241002a](https://www.bis.org/review/r241002a.pdf)

**Singapore – COSMIC**
- COSMIC (Collaborative Sharing of ML/TF Information & Cases) is run by MAS and was launched 1 April 2024 with DBS, OCBC, UOB, Citibank, HSBC and Standard Chartered. Its legal basis is FSMA amendments passed May 2023.
- Sharing is permitted only when a customer shows objectively defined "red flags".
- Initial focus areas are misuse of legal persons, trade-finance abuse and proliferation financing.
- Participation is voluntary for now. MAS plans to widen coverage and make some sharing mandatory.

  — [Crowdfund Insider](https://www.crowdfundinsider.com/2024/04/223331-monetary-authority-of-singapore-launches-cosmic-platform-to-combat-money-laundering/); [ITNews Asia](https://www.itnews.asia/news/singapore-launches-digital-platform-to-combat-financial-crime-606626); [Finance Magnates](https://www.financemagnates.com/forex/mas-introduces-cosmic-to-tackle-money-laundering-and-terrorism-financing)

**Hong Kong – FINEST**
- FINEST was announced 20 June 2023 by HKMA, HKAB and HKPF as a pilot with five D-SIBs, sharing data on corporate accounts suspected in fraud-related laundering. — [HK Government](https://www.info.gov.hk/gia/general/202306/20/P2023062000522.htm); [FTI](https://viewpoints.fticonsulting.com/post/102ilj3/hkma-supports-the-launch-of-bank-to-bank-information-sharing-platform)
- By April 2025 ten banks were on FINEST. HKMA introduced legislative amendments for statutory bank-to-bank sharing, and planned an upgraded platform for end-2025. — [HKMA press release 10 Apr 2025](https://www.hkma.gov.hk/eng/news-and-media/press-releases/2025/04/20250410-7/)
- HKMA's 2025 review lists "Enhanced FINEST" as implemented with the Police, together with the legislation providing the sharing gateways. — [HKMA speech Feb 2026](https://www.hkma.gov.hk/media/eng/doc/key-information/speeches/s20260212e1.pdf)

**US – 314(b)**
- Over 7,000 institutions participated at end-2020. Eligibility extends to MSBs, insurers and compliance service providers, and SEC-registered investment advisers were added by a 2024 rule. Participants must register and verify the counterparty is registered. — [FinCEN 314(b) infographic CY2020](https://www.fincen.gov/system/files/shared/314(b)%20Infographic%20-%20Participation%20and%20Reporting%20CY2020.pdf); [Abrigo](https://www.abrigo.com/blog/section-314b-information-sharing/)
- FinCEN revised its 314(b) guidance in 2026, including anti-fraud clarifications. — [NCUA press release 2026](https://ncua.gov/newsroom/press-release/2026/ncua-highlights-anti-fraud-other-updates-fincens-revised-314b-program-guidance); [Mondaq](https://www.mondaq.com/unitedstates/money-laundering/1817746/fincen-clarifies-the-scope-of-section-314b-information-sharing-includes-fraud)

**UK – JMLIT and ECCTA**
- JMLIT is led by the NCA and co-developed with the Home Office, City of London Police, UK Finance and banks. It marked its tenth anniversary around 2025. — [NCA](https://www.nationalcrimeagency.gov.uk/news/10-year-anniversary-of-the-uks-public-private-partnerships); [GOV.UK 2015](https://www.gov.uk/government/news/anti-money-laundering-taskforce-unveiled)
- ECCTA 2023 ss.188 (direct) and 189 (via intermediary) came into force 15 Jan 2024. They disapply breach-of-confidence and civil liability to the customer when one AML-regulated firm shares with another. The condition is either a request from the other firm or a decision to take "safeguarding action". They do not override UK GDPR or privilege, and are voluntary. Government guidance was published 4 Oct 2024 and updated 3 Oct 2025. Law firms describe the gateways as underused. — [GOV.UK guidance](https://gov.uk/government/publications/information-sharing-measures-in-the-economic-crime-and-corporate-transparency-act/guidance-on-the-information-sharing-measures-in-the-economic-crime-and-corporate-transparency-act-2023); [Stephenson Harwood](https://www.stephensonharwood.com/insights/information-sharing-in-the-regulated-sector-reducing-or-increasing-risk/); [Macfarlanes](https://www.macfarlanes.com/insights/102mmv9/data-sharing-under-eccta-a-potentially-powerful-but-underused-tool-in-the-fight)

**Europol – EFIPPP**
- EFIPPP was set up in 2017 with its secretariat in Europol's EFECC. Membership grew from about 25 banks in 15 countries (c.2020) to more than 90 private stakeholders, FIUs and law-enforcement agencies (Jan 2025). — [AMLC](https://www.amlc.eu/amlc-in-europol-financial-intelligence-public-private-partnership-steering-group-efippp/); [IEU Monitoring Jan 2025](https://ieu-monitoring.com/editorial/europol-financial-institutions-and-law-enforcement-enhance-their-cooperation/538998/); [Basel Institute Quick Guide 34](https://baselgovernance.org/sites/default/files/2024-11/Quick-Guide-34.pdf)

**PET and federated-learning pilots**
- BIS Innovation Hub Nordic Centre, Project Aurora (May 2023): a proof of concept on synthetic domestic and cross-border payments data. It compared siloed, national and cross-border monitoring using ML, network analysis and PETs, and concluded collaborative approaches "are more effective in detecting money laundering networks than is the current siloed approach". — [BIS othp66](https://www.bis.org/publ/othp66.htm)
- Secondary coverage reports 60–75% detection with privacy-preserving network approaches versus under 25% for current approaches, and also "over 30%" improvement. I could not verify these figures in the BIS text. — [The Asian Banker](https://www.theasianbanker.com/press-releases/bis-project-aurora-uses-data-and-technology-to-combat-money-laundering); [fintech.global](https://fintech.global/2023/06/01/bis-innovation-hub-uses-ai-and-data-analytics-for-efficient-money-laundering-detection/); [Lucinity (participant)](https://lucinity.com/blog/project-aurora) **[vendor]**
- Swift (Sept 2025) ran a year of experiments with 13 banks (including ANZ, BNY, Intesa Sanpaolo) and Google Cloud, using federated learning plus PETs (Trusted Execution Environments, secure aggregation) on 10 million synthetic transactions. Swift reports the models were twice as effective at spotting fraud as single-bank models. Earlier announcements said 12 banks. — [Swift press release](https://swift.com/news-events/press-releases/swift-launch-ai-powered-fraud-defence-enhance-cross-border-payments); [Google Cloud](https://cloud.google.com/blog/products/identity-security/google-cloud-and-swift-pioneer-advanced-ai-and-federated-learning-tech); [Finextra](https://www.finextra.com/newsarticle/44879/swift-unveils-ai-powered-real-time-fraud-barrier) **[Swift self-reported; synthetic data]**

### Inferences
- There is a clear design pattern. Regimes that last (COSMIC, FINEST, ECCTA, 314(b), AMLR Art. 75) share on a **trigger**: red flags, suspicion, a request or a safeguarding decision. TMNL, which pooled all transactions for suspicion-less monitoring, was the model that failed legally.
- PET and federated-learning evidence is all on synthetic data, and the headline numbers are self-reported. Present them as proof-of-concept, not production results.

### Gaps
- TMNL's formal legal status in 2025–2026 (dissolved or dormant) is unconfirmed. Sources conflict. No successor Art. 75 Dutch partnership was found.
- No current COSMIC participant count or 2025–2026 expansion details from MAS primary sources were found.
- The full BIS Aurora PDF (federated-learning section 9.1.3 and quantitative tables) was not read.

## 5. Generative and agentic AI in AML (2025–2026) and regulator positions

### Takeaway
GenAI has reached production-adjacent use for investigator copilots, SAR narrative drafting and automated L1 alert disposition. In May 2026 FIS and Anthropic announced a Financial Crimes AI Agent being developed with BMO and Amalgamated Bank, with general availability planned for H2 2026. Regulators encourage AI-based monitoring (HKMA required feasibility studies, and runs a GenAI sandbox with STR use cases). But the April 2026 US model-risk guidance explicitly leaves generative and agentic AI out of scope. No regulator has yet published agent-specific human-oversight standards for AML.

### Cited Findings
**Deployments and products**
- FIS–Anthropic (4 May 2026): the agent "will compress anti-money-laundering investigations from hours to minutes". It assembles evidence across core systems, evaluates activity against typologies, surfaces the highest-risk cases, and aims to reduce false positives and improve SAR narrative quality. BMO and Amalgamated Bank are "in development with the agent today". FIS says investigators "remain in control of every decision" and that every agent decision is traceable and auditable. — [FIS press release](https://www.fisglobal.com/about-us/media-room/press-release/2026/fis-brings-agentic-ai-to-banking-with-anthropic-starting-with-financial-crimes); [fintech.global](https://fintech.global/2026/05/06/fis-taps-anthropic-to-automate-aml-with-ai-agents/) **[vendor claim]**
- Chartis's 2025 RiskTech100 introduced a "Financial Crime Co-pilot" award, won by Lucinity. — [Chartis winners](https://www.chartis-research.com/risk-tech100/winners)
- Socure/Fravity puts agents into AML alert disposition, with a claimed 70% false-positive reduction from an undisclosed deployment. — [BERI](https://www.beri.net/tag/alert%20disposition) **[vendor claim, unverified]**

**Hong Kong (HKMA)**
- Circular of 9 Sept 2024, "Use of Artificial Intelligence for Monitoring of Suspicious Activities": authorized institutions should consider AI in monitoring. They must run a feasibility study and draft an implementation plan, reportedly board-signed and submitted by end-March 2025. Sources disagree on whether this covers all AIs or only those with significant HK operations. HKMA offered support through its Fintech Supervisory Sandbox and Chatroom. — [HKMA letter (via Gibson Dunn PDF)](https://gibsondunn.com/wp-content/uploads/2024/09/hong-kong-monetary-authority-guidance-on-gen-ai-use-in-customer-facing-applications-and-use-of-ai-in-ml-tf.pdf); [fintechnews.hk](https://fintechnews.hk/30807/ai/hkma-ai-adoption-aml-cft-monitoring/)
- HKMA GenAI Sandbox (launched Aug 2024): the first cohort had 15 use cases from 10 banks and 4 tech firms, chosen from over 40 proposals. One listed use case is "AI-powered AML suspicious transaction reporting". — [Global Government Finance](https://www.globalgovernmentfinance.com/hkma-generative-ai-sandbox-first-projects/); [HKMA GenAI paper Nov 2024](https://brdr.hkma.gov.hk/eng/doc-ldg/docId/getPdf/20241118-4-EN/20241118-4-EN.pdf); [HKMA Oct 2025 GenAI doc](https://brdr.hkma.gov.hk/eng/doc-ldg/docId/getPdf/20251031-6-EN/20251031-6-EN.pdf)

**Singapore (MAS)**
- MAS consulted on Guidelines on AI Risk Management on 13 Nov 2025 (closed 31 Jan 2026). They cover four areas: oversight; risk systems and policies; life-cycle controls; capability and capacity. They apply to all FIs proportionately, and rule-only tools fall outside the AI definition. Linklaters calls them less prescriptive than the EU AI Act but still detailed. — [Linklaters](https://www.linklaters.com/knowledge/publications/alerts-newsletters-and-guides/2025/november/27/mas-consults-on-new-ai-risk-management-guidelines-for-financial-institutions); [Allen & Gledhill](https://www.allenandgledhill.com/sg/publication/articles/31741/mas-consults-on-proposed-guidelines-for-artificial-intelligence-risk-management)

**United States**
- SR 26-2 / OCC Bulletin 2026-13 / FDIC FIL-15-2026 (17 Apr 2026) states that generative and agentic AI are "not within the scope" of the revised model-risk guidance. The agencies signalled a forthcoming RFI on bank AI use. — [Baker Tilly](https://www.bakertilly.com/insights/updated-interagency-guidance-on-model-risk-management); [Domino](https://domino.ai/blog/what-changes-with-sr-26-2) **[secondary]**
- FinCEN and FINRA have published on GenAI-enabled fraud and laundering risk, especially deepfake identity documents. Suggested controls include checking image metadata and using deepfake-detection tools. — [Legal500](https://www.legal500.com/intelligence/united-states/finance-and-banking/fincen-finra-offer-steps-to-manage-aml-and-fraud-risks-posed-by-genai) **[secondary]**
- One commentary (May 2026) says neither FinCEN nor US bank regulators have defined adequate human-oversight standards for agentic AML systems. — [traversaal.ai](https://www.traversaal.ai/blog/agentic-ai-aml-compliance-fis-anthropic-financial-crimes-agent-banking-investigations) **[vendor blog]**

**UK (FCA)** — FCA's "Supercharged Sandbox" has explored ML and agentic systems for financial crime, and its "AI Live Testing" programme examines governance and monitoring. — [360factors](https://www.360factors.com/blog/agentic-ai-updates/) **[secondary; FCA primary not retrieved]**

**Industry standard-setters**
- Wolfsberg *Monitoring for Suspicious Activity Part II: Transitioning to Innovation* (27 Aug 2025) sets three pillars for moving from rules to ML/AI/automation: transition and validation; balancing model risk against financial-crime risk; explainability. — [Wolfsberg](https://wolfsberg-group.org/resources/202)
- Wolfsberg *Principles for Using AI/ML in Financial Crime Compliance* (1 Dec 2022) has five principles: legitimate purpose, proportionate use, design and technical expertise, accountability and oversight, openness and transparency. — [Regulation Tomorrow](https://www.regulationtomorrow.com/2022/12/the-wolfsberg-group-publishes-principles-for-using-artificial-intelligence-and-machine-learning-in-financial-crime-compliance/)

**Academic graph-ML benchmarks**
- IBM/ETH "AMLworld" (Altman et al., NeurIPS 2023) is an agent-based synthetic transaction generator with full laundering labels. It covers 8 patterns (fan-in, fan-out, bipartite, stack, random, cycle, scatter-gather, gather-scatter). Sizes run from LI-Small (about 706k nodes, 6.9m edges) to HI/LI-Large (about 2.1m nodes, about 180m edges). — [alphaXiv 2306.16424](https://alphaxiv.org/overview/2306.16424v3); [arXiv 2503.24259 review](https://arxiv.org/pdf/2503.24259)
- Elliptic2 (Bitcoin laundering subgraphs, NeurIPS 2023) is a related benchmark. — [IBM Research](https://research.ibm.com/publications/identifying-money-laundering-subgraphs-on-the-blockchain)

### Inferences
- The regulatory posture is "rules/ML detect, humans decide, AI may assist and explain." FIS's "investigators remain in control of every decision", HKMA's sandbox approach and the SR 26-2 carve-out all match this. It also matches the TwinAML rules-before-AI principle.
- Because SR 26-2 excludes GenAI and agentic AI, US banks will likely govern copilots and agents under general AI, third-party and compliance risk frameworks rather than model validation. That leaves a gap until the promised RFI or new guidance arrives.

### Gaps
- No primary FCA statement specific to AI in AML (for example a Dear CEO letter or the AI Update) was retrieved.
- No MAS final AIRM guidelines (post-consultation) were found, and it is unknown whether they were issued in 2026.
- No independent, published performance evaluation of GenAI L1 triage or narrative drafting was found. All performance claims are from vendors.
- No primary FinCEN statement on GenAI-drafted SAR narratives was found.

## 6. How regulators supervise and test AML software (model risk, Part 504, tuning, validation, enforcement)

### Takeaway
US supervision rests on model-risk guidance: SR 11-7 / OCC 2011-12, applied to BSA/AML in the April 2021 interagency statement (SR 21-8). On 17 April 2026 both were replaced by SR 26-2 / OCC Bulletin 2026-13, which is materiality-based, excludes deterministic rule-based processes from the "model" definition, and excludes GenAI and agentic AI. New York separately requires annual Part 504 certification of TM and filtering programmes. Elsewhere, HKMA is actively pushing AI-based monitoring, MAS is building AI risk-management guidelines, and FCA enforcement shows the testing focus is data completeness and correct configuration.

### Cited Findings
**US model-risk guidance**
- SR 21-8 (9 Apr 2021; Fed, FDIC, OCC with FinCEN and NCUA) explained how model-risk guidance applies to BSA/AML systems. Some BSA/AML systems meet the "model" definition and some do not. It allowed risk-based, change-focused validation for frequent low-materiality rule and threshold updates instead of full revalidation. A companion RFI closed 11 Jun 2021. — [Federal Reserve SR 21-8](https://www.federalreserve.gov/supervisionreg/srletters/SR2108.htm); [RSM](https://rsmus.com/insights/services/risk-fraud-cybersecurity/interagency-statement-on-model-risk-management-for-bank-systems.html)
- SR 26-2 (17 Apr 2026; also OCC Bulletin 2026-13, FDIC FIL-15-2026) "supersedes and replaces SR letter 11-7 and SR letter 21-8". Its main changes:
  - oversight scaled to materiality;
  - a narrower model definition that excludes simple arithmetic, deterministic rule-based processes, and software with no statistical, economic or financial theory behind it;
  - GenAI and agentic AI excluded;
  - the letter says it sets no enforceable standards, and non-compliance alone will not draw supervisory criticism.

  Sources disagree on its scope threshold; one cites $30bn in assets. — [Baker Tilly](https://www.bakertilly.com/insights/updated-interagency-guidance-on-model-risk-management); [Abrigo](https://www.abrigo.com/blog/model-risk-management-what-sr-26-2-means-for-financial-institutions/); [Domino](https://domino.ai/blog/what-changes-with-sr-26-2); [Matrix-IFS](https://www.matrix-ifs.com/blog/sr-26-02-model-risk-management/) **[secondary; Fed primary text not fetched]**
- Practitioners advise keeping TM and screening models in inventory, tiered by materiality, and keeping vendor AML tools validatable despite proprietary code. — [Matrix-IFS](https://www.matrix-ifs.com/blog/sr-26-02-model-risk-management/); [CICRIM](https://www.cicrim.com/insights/sr-26-2-model-risk-management.html)

**NYDFS Part 504**
- 3 NYCRR 504 requires a risk-based Transaction Monitoring Program and a Filtering Program. An annual certification is due 15 April and may be filed while known deficiencies are being remediated. The 2015 proposal had floated criminal liability for false certifications; check the final rule. — [Justia 504.3](https://regulations.justia.com/states/new-york/title-3/chapter-iii/subchapter-c/part-504/section-504-3/); [Perficient 2026](https://blogs.perficient.com/2026/01/28/part-504-compliance-deadline-fast-approaching-for-bfsi-firms-in-new-york); [SRZ on 2015 proposal](https://www.srz.com/a/web/163162/8cbvz4/120415_nydfs_proposes_new_aml_sanctions_programs_and_annual_cert.pdf)
- Robinhood Crypto (NYDFS, Aug 2022, $30m): an inadequate TM system, an improper compliance certification, and an 18-month independent consultant. — [Orrick](https://www.orrick.com/en/Insights/2022/08/NYDFS-Fines-Trading-Platform-for-BSA-AML-Transaction-Monitoring-and-Cybersecurity-Lapses)
- A Dec 2016 NYDFS consent order against a European bank ($235m) cited deficient TM that ignored shell-company activity. It was described as a platform for reinforcing Part 504. — [Protiviti](https://blog.protiviti.com/2016/12/20/tis-the-season-to-get-serious-about-part-504/)
- Nordea (NYDFS, Aug 2024, $35m): KYC and AML failures at its Baltic and Danish units, cited under 3 NYCRR 116.2, not Part 504. — [JD Supra NYDFS topic](https://www.jdsupra.com/topics/consent-order/nydfs/)

**Enforcement where monitoring or screening systems failed** (details in Section 1)

| Case | Regulator / year | Failure | Penalty |
|---|---|---|---|
| TD Bank | DOJ/FinCEN, 2024 | Deliberately excluded feeds: 92% of volume unmonitored | about $3bn, asset cap, monitorship |
| Metro Bank | FCA, 2024 | Data-feed error: 60m+ transactions unmonitored | £16.7m |
| Starling Bank | FCA, 2024 | Screening misconfiguration: 39 of 3,088 names | £29m |
| Robinhood Crypto | NYDFS, 2022 | Inadequate TM and improper certification | $30m |

  — sources as cited above.

**Asia**
- HKMA requires a feasibility study and implementation plan for AI in monitoring (2024–25). — [Gibson Dunn](https://www.gibsondunn.com/hong-kong-monetary-authority-guidance-on-gen-ai-use-in-customer-facing-applications-and-use-of-ai-in-ml-tf/)
- MAS AIRM consultation (Nov 2025) proposes life-cycle controls, oversight and inventory for AI across FIs. — [Linklaters](https://www.linklaters.com/knowledge/publications/alerts-newsletters-and-guides/2025/november/27/mas-consults-on-new-ai-risk-management-guidelines-for-financial-institutions)

**Industry validation frame** — Wolfsberg MSA Part II (2025) says the move to ML must involve "transition and validation", a balance of model risk against financial-crime risk, and explainability for coverage and effectiveness. — [Wolfsberg](https://wolfsberg-group.org/resources/202)

### Inferences
- SR 26-2's exclusion of "deterministic rule-based processes" probably takes many classic threshold-based TM scenarios out of formal US model-risk scope. They would then be governed as BSA/AML program controls (coverage, tuning, testing) rather than "models", while ML risk scores stay in scope. This reading is from secondary summaries and should be checked against the primary text.
- The enforcement record suggests supervisors test four things in practice:
  1. **Completeness and lineage**: does every product and transaction type reach the engine (TD, Metro)?
  2. **Configuration and list integrity** (Starling).
  3. **Scenario coverage and tuning against the risk assessment** (the 2016 NYDFS order).
  4. **Truthful attestation** (Part 504 / Robinhood).

  A digital twin for training could inject exactly these four failure modes.

### Gaps
- No primary source was retrieved describing above-the-line/below-the-line (ATL/BTL) threshold-tuning methodology, for example the FFIEC BSA/AML Examination Manual or the OCC handbook. The technique (sampling alerts just below thresholds to test whether thresholds are set right) is standard practice but uncited here.
- SR 26-2 primary text (federalreserve.gov) was not fetched. The scope threshold ($30bn or otherwise) and the exact BSA/AML language are unverified.
- No FCA primary guidance on AI/ML model governance in AML (beyond enforcement notices) was retrieved. The FCA Financial Crime Guide's sections on TM testing were not checked.
- No 2024–2026 NYDFS order expressly finding a false Part 504 certification was found.
- No EU/AMLA supervisory expectations for TM-system testing were found. AMLA RTS work was not searched.
