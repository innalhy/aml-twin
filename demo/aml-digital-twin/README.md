# TwinAML behavioral sandbox

One-week COMP3424 demo. The digital twin in this folder is a **controlled simulation layer for testing detection logic**: a synthetic ledger you can poke, with two readings of the same payments.

The week of 2–6 March 2026 is fictional. Every customer, account, and amount was written for the classroom. The amount line is a dial in this app. It is not a statutory reporting threshold, and this page does not file a suspicious transaction report. The playable scripts under [`data/cases/`](../../data/cases/README.md) are where a trainee chooses a disposition.

Streamlit and the bundled CSV are enough. Neo4j Bloom is an optional second view of the same ledger. The Unity room is a separate face and is not used this week.

## Run it

From this folder, with Python 3.11 or newer:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

Open the URL Streamlit prints (usually `http://127.0.0.1:8501`). On a VPS, bind localhost and put nginx or Caddy in front if you want classmates to reach it. Docker is not required, and this app is not part of the API deploy in [`docs/deploy-vps.md`](../../docs/deploy-vps.md).

```bash
streamlit run app.py --server.address 127.0.0.1 --server.port 8501
```

Check the detectors without opening a browser:

```bash
PYTHONPATH=. python -m unittest discover -s tests -v
```

## What the screen is comparing

AML here means the controls a firm uses when money may be the proceeds of crime. Two readings run on one ledger.

| Reading | What it looks at | What moves when you drag the slider |
| --- | --- | --- |
| Before / After, rule only | One payment against the amount line | The alert count |
| Graph-linked cases | The payment network | Nothing. The three cases stay |

On the bundled week the counts are:

| Amount line | Rule-only alerts | Graph-linked cases |
| --- | --- | --- |
| HKD 10,000 (the Before column) | 16 | 3 |
| HKD 5,000 | 30 | 3 |
| HKD 1,000 (bottom of the dial) | 33 | 3 |

The 16 alerts at HKD 10,000 mix four ordinary large payments (two salaries, office rent, and a jewellery-export invoice) with the hops of a loop and the hops toward a mixer wallet. The eight smurf slices, HKD 6,200 to HKD 9,400, are absent from that queue. At HKD 5,000 those eight slices join as eight separate rows, plus home rent, two smaller salaries, a course fee, an insurance premium, and a family transfer. The graph still reports one smurfing case, one circular flow, and one mule-to-mixer path.

`amount_hkd` on a graph case is the sum of its payments. In the loop and on the mule path the same funds are counted once per hop. The smurfing total, HKD 62,900, is eight distinct slices into one account, so that figure is the amount collected.

Words used on the page:

- **Smurfing** — many payments kept under a line. The line in this sandbox is the classroom dial.
- **Circular flow** — money returns to an account it has already left. No merchant sits on the loop.
- **Mule** — an account that moves someone else's funds onward.
- **Mixer** — in this ledger, the wallet on `reference_wallets.csv`. The last hop lands there.
- **Pass-through** — the account received at least HKD 15,000 and sent on at least 75 percent of it, with the last outbound payment no later than 36 hours after the first inbound payment. Merchant and employer segments are left out of this test.
- **FPS** — Faster Payment System, the Hong Kong retail rail, used as a channel label.
- **CHATS** — Clearing House Automated Transfer System, used as the label on larger synthetic transfers.

The detectors do not read `planted_typology`, `role`, `case_label`, or `kyc_narrative` to decide a case. Those fields are stored on the twin so the screen can show them after the structure is found. The facilitator checkbox compares the planted column with the detected story.

## One-week presenter script

Each day is a classroom hour. The numbers above are the bundled week. If a student uploads another CSV, read the metrics off the screen instead.

### Day 1 — Open the mirror

Goal: the room can see that the twin is a ledger, and can name who is in it.

1. Start Streamlit and leave the amount line at HKD 10,000.
2. Read the disclaimer on **Briefing** aloud. Say that this is a virtual bank for the course.
3. Open **Ledger**. There are 37 nodes (accounts, one shared handset, one recruiter, one wallet) and 37 payments, plus 11 non-payment links.
4. Point at three ordinary names (Ada Lam, Harbour Staff Payroll, North Point Grocer) and three accounts you will come back to: Ivan Tsang (`SYN-SM-HUB`), Lee Kwan (`SYN-MU-L1`), Kai Mensah (`SYN-DF-01`).
5. Hover is not required yet. End on the sentence: tomorrow the amount rule will look at each payment alone.

### Day 2 — Rule only, at the starting line

Goal: the queue is busy, and it has not told a story.

1. Stay at HKD 10,000. **Before** and **After** both show 16, because the line has not moved.
2. Open **Alerts**. Read a salary row and the jewellery-export row (`T-TB-01`, HKD 85,000, memo "Jewellery export invoice") next to a mule hop. The rule text on each row says the payment was judged alone.
3. Ask the room which of those 16 they would open first, and why the rule cannot answer.
4. Sort the comparison table by graph story. The eight smurfing rows are already listed there with Before = No. Do not explain the pattern yet. Ask them to notice the amounts: each one is under 10,000, and they share a receiver.
5. Four rule alerts sit outside every network case: `T-PAY-01`, `T-PAY-02`, `T-RENT-OFF`, `T-TB-01`. That is the "Rule alerts outside every case" metric, value 4.

### Day 3 — Stress the line

Goal: a lower line makes a longer queue.

1. Say what you are about to do, then drag the amount line to HKD 5,000.
2. **Before** stays 16. **After** becomes 30. The bar chart on **Briefing** shows the same pair. Graph-linked cases stay 3, with a delta of 0.
3. On **Alerts**, yellow rows are payments one line lists and the other does not. The eight loans and gifts into Ivan Tsang are now individual alerts. So are home rent, two smaller salaries, a course fee, a premium, and a family transfer.
4. Optional: drag to HKD 1,000. The count becomes 33. Lunch, a taxi share, and a textbook join. Grocery card slips of HKD 90 to HKD 320 stay off the queue.
5. Reset the line to HKD 10,000 before you finish, so day 4 starts from the quiet rule. The "Moves in this browser session" table is a local thread of those drags. It is not the API event log in `backend/`.

### Day 4 — The linked twin

Goal: the same payments, read as three cases.

1. Open the three expanders under **Graph-linked cases** and read the plain-language paragraph in each.
2. **Smurfing** (`G-SMURF-SYN-SM-HUB`). Eight senders, one hub, HKD 62,900, all on 3 March 2026, and they share handset `DEV-SMURF-7`. At HKD 10,000 the amount rule lists none of them. At HKD 5,000 it lists all eight, still as eight rows.
3. **Circular flow** (`G-CYCLE-1`). Aaron Bell, Bea Cho, Chris Dang, and Dana Eng pay around a loop on 4 March (HKD 18,000, 17,500, 17,000, 16,500). Memos say consulting and loan. The amount rule already has four rows. The case keeps the loop. The narrative label on the accounts is `hk-triad-cashflow-001`.
4. **Mule to mixer** (`G-MULE-SYN-MIX-01`). Victim payments and a supplier payment land on accounts that pay most of the money onward the same day, and the last hop is `SYN-MIX-01` on the sandbox watchlist. Kai Mensah (`SYN-DF-01`) carries the video-KYC note: liveness failed twice, then passed. That note is the deepfake theme from `deepfake-hk-001`. The path test does not read the note. A `CONTROLS` link runs from the synthetic recruiter to the three mule accounts. That link is not a payment.
5. Open **Network**. Orange, teal, and purple match the three cases. Switch the "Show" box to **Mule to mixer** and hover Kai Mensah, Lee Kwan, and SYN Mixer Pool. Dashed rose edges are `CONTROLS` or `USES_DEVICE`.

### Day 5 — Bloom, if you have it

Goal: hover the same three patterns in Neo4j. If you do not have Neo4j, repeat day 4 on the Network tab and say that tab is the offline twin. Skip the rest of this day.

Desktop or a local Neo4j 5:

1. Copy `data/*.csv` into the database import folder as `import/twinaml/`.
2. Paste [`cypher/load_twin.cypher`](cypher/load_twin.cypher) into Browser and run it. The script deletes only nodes tagged `twinaml-aml-week`.
3. Run [`cypher/stories.cypher`](cypher/stories.cypher). You want one smurfing hub (`SYN-SM-HUB`), the four-account loop (listed once per starting node), and paths that end at the watchlist wallet.
4. Open Bloom with [`cypher/bloom_perspective.md`](cypher/bloom_perspective.md). Color by `kind` first. Save the three searches. Turn on the facilitator colors only after the searches, and say that those colors repeat labels stored on the node.

Aura or Neo4j Sandbox, from this folder, with a venv active:

```bash
cp .env.example .env
# fill NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD
# set NEO4J_SANDBOX_CONFIRM=twinaml-aml-week before any write
python -m twinaml_sandbox.neo4j_link --write
python -m twinaml_sandbox.neo4j_link --counts
```

The write refuses to run until the confirm string is set. It does not delete untagged nodes. The Streamlit **Neo4j Bloom** tab can ping the database and print those path counts. `cycle_paths` and `mixer_paths` count walks, so they are larger than the three cases. `smurf_hubs` should be 1.

`planted_typology` stays in the CSV. It is not written onto `SENT`, so Bloom does not show the answer key.

### Day 6 — Answer key and the quiet rows

Goal: the room can say what the rules caught, what they flooded, and what they left as a single large payment.

1. Turn on **Show facilitator answer key**. Every planted row should match the detected story. A mismatch is a bug in this sandbox, not a new typology.
2. Talk through three quiet or noisy rows:
   - Salaries and office rent alert at HKD 10,000 and sit in no network case.
   - The jewellery-export invoice (`hk-daybreak-tbml-001` on the two trade desks) is one large payment with no loop and no path to the mixer. The graph leaves it as an amount-rule row. This sandbox has no shipment record to test, so do not promote it to a trade-finance finding.
   - Grocery takings at the North Point Grocer stay under the bottom of the dial.
3. Rules decide the alerts. The answer key is the scenario script. Nothing on this page asks a language model to score a customer.

### Day 7 — Eight-minute running order

Use the bundled week. Leave Neo4j closed unless day 5 already worked, in which case one Bloom search replaces the last minute.

| Minute | Do this | Say this |
| --- | --- | --- |
| 0:00 | Briefing disclaimer, line at HKD 10,000 | This ledger is the twin. We use it to test detection logic. |
| 0:30 | Alerts, Before = After = 16 | The amount rule judges one payment at a time. A salary sits next to a mule hop. |
| 2:00 | Drag to HKD 5,000 | The queue goes from 16 to 30. The eight slices under the old line are now eight alerts. |
| 4:00 | Graph-linked cases, still 3 | The network reading did not follow the dial. One hub, one loop, one path into the watchlist wallet. |
| 6:00 | Network, filter Mule to mixer, hover Kai Mensah | The video-KYC note is the deepfake label from the course script. The path is what selected the case. |
| 7:30 | Point at the jewellery invoice, still a lone rule row | A large payment is a row. A linked case is a story. The dial chooses how many rows you must read. |

## Narrative labels

`case_label` points at a course script. It is a teaching crosswalk.

| Label | Where it sits in this ledger | Course script |
| --- | --- | --- |
| `deepfake-hk-001` | Kai Mensah, video-KYC liveness failed twice, then passed | [`01-deepfake-hk-001.example.json`](../../data/cases/01-deepfake-hk-001.example.json) |
| `hk-mule-rent-001` | Lee Kwan, login described as rented; recruiter `CONTROLS` link | [`03-mule-rent-001.example.json`](../../data/cases/03-mule-rent-001.example.json) |
| `hk-greythunder-mule-001` | Grey Cluster Desk, second hop | [`06-greythunder-mule-001.example.json`](../../data/cases/06-greythunder-mule-001.example.json) |
| `hk-justicegate-crypto-001` | Cash-out Desk and SYN Mixer Pool | [`05-justicegate-crypto-001.example.json`](../../data/cases/05-justicegate-crypto-001.example.json) |
| `hk-triad-cashflow-001` | The four-account loop, memos say consulting and loan | [`09-triad-cashflow-001.example.json`](../../data/cases/09-triad-cashflow-001.example.json) |
| `hk-daybreak-tbml-001` | Daybreak Shell Desk to Overseas Buyer Desk, jewellery-export memo | [`02-daybreak-tbml-001.example.json`](../../data/cases/02-daybreak-tbml-001.example.json) |

Smurfing has no `case_id` of its own in the library. The nearest write-ups are the mule and mixer flows in [`data/case-flow/02-crypto-mixers-mule-accounts.en.md`](../../data/case-flow/02-crypto-mixers-mule-accounts.en.md) and [`data/case-flow/06-account-rental-mule-clusters.en.md`](../../data/case-flow/06-account-rental-mule-clusters.en.md). Public-reporting notes for those scripts live in [`data/cases/README.md`](../../data/cases/README.md). This sandbox does not add a new regulatory claim on top of them.

Course terms, in this folder only: the CSV world is the mirror; dragging the line and reading the new counts is a short shadow of that mirror; each case lists the payment ids it used, which is the thread. The VPS API in `backend/` remains the session twin for the playable scripts. This app does not write to it.

## Files

| Path | Role |
| --- | --- |
| `app.py` | Streamlit UI |
| `data/accounts.csv` | Accounts, the shared handset, the recruiter, the wallet |
| `data/transactions.csv` | The synthetic week, including `planted_typology` |
| `data/relationships.csv` | `CONTROLS` and `USES_DEVICE` |
| `data/reference_wallets.csv` | The mixer watchlist the mule rule may walk toward |
| `twinaml_sandbox/` | Load, amount rule, network cases, drawing, optional Neo4j write |
| `cypher/load_twin.cypher` | Browser load for a local Neo4j import folder |
| `cypher/stories.cypher` | Three inspection queries |
| `cypher/bloom_perspective.md` | What to color and what to hover |
| `.env.example` | Blank Neo4j settings |

Account columns: `account_id`, `customer_id`, `name`, `segment`, `role`, `kind`, `opened_on`, `kyc_narrative`, `case_label`, `device_id`, `city`. `kind` is `bank_account`, `wallet`, `person`, or `device`. Payments can only touch a bank account or a wallet.

Payment columns: `txn_id`, `booked_at`, `from_account`, `to_account`, `amount_hkd`, `channel`, `memo`, `planted_typology`. `booked_at` is an ISO timestamp.

To replace the bundled CSV from the authoring module after an intentional edit:

```bash
python -m twinaml_sandbox.ledger --write
```

The **Ledger** sidebar can upload a CSV with the same columns. Relationships and the watchlist are optional. Without a watchlist the mule case has no wallet to walk toward. The loader accepts up to 400 accounts and 2,000 payments.

## 中文簡述

這是 COMP3424 的一週課堂沙盒。數位分身在這裡是一份可調整的合成帳本，用來測試兩種偵測讀法：單筆金額門檻，以及把同一批付款讀成網絡。門檻是示範旋鈕。客戶、帳戶、金額都是虛構的。Neo4j Bloom 可選；只靠 CSV 與 Streamlit 就能上課。本資料夾不取代 API，也不使用 Unity。

## License

This folder is part of the proprietary TwinAML course demo. See the repository [`README.md`](../../README.md).
