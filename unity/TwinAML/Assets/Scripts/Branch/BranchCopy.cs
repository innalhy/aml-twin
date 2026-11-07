using System.Collections.Generic;

namespace TwinAml
{
    /// <summary>
    /// Topic 3 room copy. The compliance outcome stays in the schema 0.1 case.
    /// This table is the walkable exercise: documents, questions, and feedback.
    /// </summary>
    public static class BranchCopy
    {
        static readonly Dictionary<string, string> En = new Dictionary<string, string>();
        static readonly Dictionary<string, string> Zh = new Dictionary<string, string>();
        static bool _ready;

        public static string T(string key)
        {
            Ensure();
            string value;
            if (En.TryGetValue(key, out value)) return value;
            return key ?? "";
        }

        static void Both(string key, string en, string zh)
        {
            En[key] = en;
            Zh[key] = zh;
        }

        static void Ensure()
        {
            if (_ready) return;
            _ready = true;

            Both("hud.synthetic", "Synthetic training branch. Not a bank system.", "合成培訓分行。並非銀行系統。");
            Both("hud.use", "Click or press E", "點擊或按 E");
            Both("hud.tasks", "Tasks", "任務");
            Both("hud.notes", "Notes", "筆記");
            Both("hud.pause", "Pause", "暫停");
            Both("hud.close", "Close", "關閉");
            Both("hud.back", "Back", "返回");
            Both("hud.hint", "Hint", "提示");
            Both("hud.mark", "Mark the issue", "標記問題");
            Both("hud.unmark", "Clear the mark", "取消標記");
            Both("hud.supplement", "Request a supplement", "要求補充");
            Both("hud.note", "Add to notes", "加入筆記");
            Both("hud.submit", "Submit this action", "提交此行動");
            Both("hud.reason", "Short reason (stored with this session)", "簡短理由（與此練習一併保存）");
            Both("hud.lang", "中 / EN", "中 / EN");
            Both("hud.controls", "Hold left mouse to walk forward · hold right mouse to walk back · move the mouse to turn · click an object to use", "按住左鍵向前走 · 按住右鍵後退 · 移動滑鼠轉向 · 點擊物件互動");

            Both("zone.lobby", "Lobby", "大堂");
            Both("zone.desk", "Relationship desk", "客戶經理櫃位");
            Both("zone.meeting", "Meeting room", "會客室");
            Both("zone.files", "File room", "檔案室");
            Both("zone.compliance", "Compliance office", "合規辦公室");

            Both("spot.client", "Mr Li", "李先生");
            Both("spot.computer", "System note", "系統紀錄");
            Both("spot.policy", "CDD policy folder", "盡職審查政策");
            Both("spot.structure", "Ownership chart", "股權架構圖");
            Both("spot.decision", "Compliance officer", "合規人員");
            Both("spot.passport", "Passport", "護照");
            Both("spot.address", "Address proof", "地址證明");
            Both("spot.br", "Business registration", "商業登記證");
            Both("spot.directors", "Register of directors", "董事名冊");
            Both("spot.members", "Register of members", "股東名冊");
            Both("spot.plan", "Business plan", "業務計劃");
            Both("spot.funds", "Source-of-funds note", "資金來源說明");
            Both("spot.mandate", "Mandate", "授權書");

            Both("task.greet", "Greet Mr Li and learn the purpose", "接待李先生並了解開戶目的");
            Both("task.docs", "Review the eight documents", "審閱八份文件");
            Both("task.ask", "Ask the CDD questions", "提出盡職審查問題");
            Both("task.ubo", "Trace the chart to a natural person", "沿架構圖追到自然人");
            Both("task.funds", "Challenge the source of funds", "質疑資金來源");
            Both("task.decide", "Record the decision with compliance", "與合規人員作開戶決定");

            Both("greet.lead", "Mr Li is waiting in the lobby. He says he needs a company account today for an electronics trading firm.", "李先生在大堂等候。他稱今天要為一間電子產品貿易公司開立公司戶口。");
            Both("greet.q.service", "What service are you here for?", "請問今天想辦理甚麼服務？");
            Both("greet.a.service", "A corporate HKD account, a foreign-currency account, and a first look at trade finance.", "公司港幣戶口、外幣戶口，以及貿易融資的初步查詢。");
            Both("greet.q.company", "Which company are you representing?", "請問您代表哪一家公司？");
            Both("greet.a.company", "Starlight Trading Limited. I am a director and the main shareholder.", "星輝貿易有限公司。我是董事，也是主要股東。");
            Both("greet.q.business", "What does the company do?", "請問貴公司主要從事甚麼業務？");
            Both("greet.a.business", "Electronics. Buyers and suppliers in Southeast Asia and the Middle East. He does not name them.", "電子產品。買家與供應商在東南亞及中東。他沒有說出名稱。");
            Both("greet.q.volume", "What is the account for, and what volume do you expect?", "請問帳戶用途及預期交易量是甚麼？");
            Both("greet.a.volume", "About HKD 2,000,000 a month, starting now. Trade payments in and out.", "大約每月港幣二百萬，現在就要開始。貿易款項有入有出。");
            Both("greet.invite", "Invite him to the desk", "請他到櫃位");
            Both("greet.warn", "You have not asked both the purpose and the expected volume. You can continue, and the feedback will record the gap.", "你尚未同時問到開戶目的與預期交易量。你可以繼續，回饋會記下這項缺口。");
            Both("greet.go", "Continue anyway", "仍要繼續");

            Both("desk.lead", "Mr Li is at the desk. The papers are on the counter. The ownership questions belong in the meeting room.", "李先生在櫃位。文件在櫃檯上。股權問題宜在會客室追問。");
            Both("desk.move", "Take him to the meeting room", "帶他到會客室");

            Both("ask.lead", "Choose a question. Must-ask items are marked. An inappropriate question is on the list so you can leave it unasked.", "選擇一條問題。必問題目已標明。清單上另有一條不適當的問題，你可以不問。");
            Both("tag.must", "Must ask", "必問");
            Both("tag.recommended", "Worth asking", "建議問");
            Both("tag.bad", "Inappropriate", "不適當");
            Both("ask.customers", "Who are the main customers and suppliers?", "請問主要客戶及供應商是誰？");
            Both("ask.customers.reply", "Various buyers. The contracts are not with him today. He names no one.", "不同的買家。合約今天沒有帶來。他沒有說出任何名稱。");
            Both("ask.sof", "What is the source of funds?", "請問主要資金來源是甚麼？");
            Both("ask.sof.reply", "Personal savings and business income. He offers no statement and no contract that could support the volume.", "個人儲蓄及業務收入。他沒有結單，也沒有能支持該交易量的合約。");
            Both("ask.ubo", "Who is the natural person behind the BVI shareholder?", "請問 BVI 股東背後的實益擁有人是誰？");
            Both("ask.ubo.reply", "He says he runs the company and the BVI company is only a holding vehicle. He will not name the person behind it. That does not match \"I am the main shareholder.\"", "他說公司由他經營，BVI 公司只是持股工具。他不願指出背後的人。這與「我是主要股東」並不一致。");
            Both("ask.volume", "Why is a new company expecting this volume?", "為何公司成立不久已有如此高的交易量？");
            Both("ask.volume.reply", "The orders are already lined up. He said a moment ago that the contracts were not with him. The two answers do not sit together.", "訂單已經排好。他稍早又說合約沒有帶來。兩個答案對不上。");
            Both("ask.geo", "Which higher-risk places do you deal with?", "請問與哪些較高風險地區有業務往來？");
            Both("ask.geo.reply", "He says none. Check the system note before you rely on that denial.", "他說沒有。在採信這句否認之前，請先看系統紀錄。");
            Both("ask.authority", "Are you authorised to open the account?", "請問您是否有權代表公司開立帳戶？");
            Both("ask.authority.reply", "He says a director can sign. The mandate on the desk does not say he may open or operate an account.", "他說董事就可以簽署。櫃檯上的授權書並沒有寫明他可以開戶或操作戶口。");
            Both("ask.skip", "Can we skip this and open the account today?", "這些問題不重要，今天先開戶好嗎？");
            Both("ask.skip.reply", "He looks relieved and says yes. That question gave away the review.", "他顯得鬆了一口氣，並表示可以。這條問題放棄了審查。");

            Both("doc.passport.body", "Synthetic passport. Holder: Mr Li. Number: SYN-P-4401. Address printed inside: Flat 12, 8 Example Street, Kowloon. Not a real travel document.", "合成護照。持有人：李先生。號碼：SYN-P-4401。內頁地址：九龍示例街 8 號 12 室。並非真實旅行證件。");
            Both("doc.address.body", "Synthetic utility bill. Service address: Flat 12, 18 Other Road, Kowloon. The street is not the street in the passport.", "合成水電單。服務地址：九龍另一路 18 號 12 室。街道與護照所載不同。");
            Both("doc.br.body", "Synthetic Business Registration. Starlight Trading Limited. Number: SYN-BR-4401. Incorporated 8 August 2026. Electronics import and export. The exercise date is 7 November 2026, so the company is about three months old.", "合成商業登記。星輝貿易有限公司。號碼：SYN-BR-4401。2026 年 8 月 8 日成立。電子產品進出口。演習日期為 2026 年 11 月 7 日，公司成立約三個月。");
            Both("doc.directors.body", "Synthetic register of directors. Only director: Mr Li, appointed 8 August 2026. Being a director does not make him the beneficial owner.", "合成董事名冊。唯一董事：李先生，2026 年 8 月 8 日委任。擔任董事並不使他成為實益擁有人。");
            Both("doc.members.body", "Synthetic register of members. BVI Holding Ltd 80 percent. Mr Li 20 percent. The register stops at the BVI company.", "合成股東名冊。BVI Holding Ltd 持有百分之八十。李先生持有百分之二十。名冊止於該 BVI 公司。");
            Both("doc.plan.body", "Synthetic business plan. One person. No warehouse, no audited accounts, no named buyers. Projected flow about HKD 2,000,000 a month from the first month.", "合成業務計劃。一人公司。沒有貨倉、沒有審計帳、沒有指名買家。由第一個月起預計每月來往約港幣二百萬。");
            Both("doc.funds.body", "Synthetic source-of-funds note. The words are personal savings and business income. No bank statement and no contract support a monthly flow of HKD 2,000,000.", "合成資金來源說明。用詞是個人儲蓄及業務收入。沒有銀行結單，也沒有合約，不足以支持每月港幣二百萬的流量。");
            Both("doc.mandate.body", "Synthetic mandate. It lets Mr Li collect mail and documents. It does not let him open a bank account or operate one.", "合成授權書。授權李先生收取信件及文件。並未授權他開立或操作銀行戶口。");

            Both("issue.address.title", "Passport address and proof do not match", "護照地址與地址證明不一致");
            Both("issue.young.title", "The company is about three months old", "公司成立約三個月");
            Both("issue.bvi.title", "The majority holder is an offshore company", "大部分股權由離岸公司持有");
            Both("issue.volume.title", "The projected flow does not fit a new one-person firm", "預期流量與新成立的一人公司不相稱");
            Both("issue.sof.title", "Source of funds is a label, not evidence", "資金來源只是說法，並非證據");
            Both("issue.mandate.title", "The mandate does not authorise opening an account", "授權書未授權開戶");
            Both("hint.none", "This page has no separate red flag. Read what it does not prove.", "這一頁本身沒有另一項紅旗。請看它沒有證明甚麼。");
            Both("hint.spent", "Hint used. The mark is still yours to make.", "已使用提示。標記仍要由你作出。");
            Both("hint.done", "The chart is already open to the last person.", "架構圖已經打開至最後一名自然人。");

            Both("computer.body", "Synthetic internal note. Expected flow about HKD 2,000,000 a month. Counterparties touch a place the bank's policy codes as HR-7 (higher risk). This screen is not a live sanctions search, and it shows no list hit. Incorporation date on the record: 8 August 2026.", "合成內部紀錄。預期每月來往約港幣二百萬。交易對手觸及銀行政策代號 HR-7 的較高風險地區。此畫面並非即時制裁名單搜查，也沒有名單命中。紀錄上的成立日期：2026 年 8 月 8 日。");
            Both("policy.body", "CDD note for this exercise. Identify and verify the customer. Identify and verify the beneficial owners. Understand who owns and controls the company. Understand the purpose and intended nature of the relationship. If you cannot do that, do not open the account. Asking for more papers can start the work. It does not finish it while the owner, the funds, or the business story are still unclear. Order enhanced due diligence. If the explanation still fails, escalate to compliance and consider refusing the relationship. Record why. This room writes a draft flag on the twin. It does not file with the Joint Financial Intelligence Unit.", "本演習的盡職審查摘要。識別並核實客戶。識別並核實實益擁有人。理解誰擁有及控制公司。理解業務關係的目的與擬進行的性質。若做不到，就不要開戶。要求補交文件可以是開始，但在擁有人、資金或業務說法仍然不清楚時，審查並未完成。應進行加強盡職審查。若解釋仍然失敗，上報合規，並考慮拒絕建立關係。把理由記下來。此房間只在孿生狀態寫下草擬旗標，不會向聯合財富情報組提交。");

            Both("node.starlight", "Starlight Trading Limited, Hong Kong. The applicant. Do not stop at the first company on the page.", "星輝貿易有限公司，香港。申請人。不要停在頁面上的第一間公司。");
            Both("node.li", "Mr Li, 20 percent, and a director. A named shareholder is not the same as the person who ultimately owns or controls the company.", "李先生，百分之二十，並為董事。名冊上的股東，並不等於最終擁有或控制公司的人。");
            Both("node.bvi", "BVI Holding Ltd, 80 percent, British Virgin Islands. No natural person is named on this node.", "BVI Holding Ltd，百分之八十，英屬維爾京群島。此節點沒有指名自然人。");
            Both("node.seychelles", "Seychelles Investment Ltd owns 100 percent of BVI Holding Ltd. Still a company. Continue to a person.", "Seychelles Investment Ltd 持有 BVI Holding Ltd 百分之百。仍然是一間公司。請繼續追到人。");
            Both("node.mr_a", "Mr A, a synthetic natural person, owns 100 percent of Seychelles Investment Ltd. The file links him to policy code HR-7 and has no identity evidence you can verify. The chart points to him, not to Mr Li.", "甲先生，合成自然人，持有 Seychelles Investment Ltd 百分之百。檔案把他連到政策代號 HR-7，且沒有可供核實的身分證據。架構圖指向他，而不是李先生。");
            Both("node.mark", "Mark: beneficial owner not verified", "標記：實益擁有人未經核實");
            Both("node.marked", "Marked. Mr A is unverified.", "已標記。甲先生未經核實。");

            Both("decide.lead", "Choose one action. The buttons are not coloured by the answer. Read what each action means, then pick one. Nothing is submitted until you confirm.", "選擇一項行動。按鈕不會用顏色提示答案。先看每項行動的意思，再選擇。確認之前不會提交。");
            Both("decide.help", "Open the account: the bank accepts the company and the account starts. Do this only when the four checks are already finished.\n\nAsk for more documents only: you wait for extra papers. You do not order a deeper check.\n\nDo not open yet — enhanced due diligence: a deeper check of the real owner, the money, and whether the business is real. The account stays closed for now. This is the usual next step when a file is unclear.\n\nPause and tell compliance: you stop the application and record an escalation. This room does not contact the authorities.\n\nRefuse: the bank will not take this company. Write down why.", "按現有文件開戶：銀行接受這間公司，戶口會開立。四項審查都完成才適合這樣做。\n\n只要求補充文件：你在等更多文件，沒有下令做更深的審查。\n\n暫不開戶並做加強盡職審查：深入核實真正的擁有人、資金，以及業務是否真實。戶口暫時不開。檔案仍不清楚時，這通常是下一步。\n\n暫停並告知合規：你停下申請並留下上報紀錄。此房間不會聯絡執法或情報機構。\n\n拒絕：銀行不接受這間公司。請寫下理由。");
            Both("decide.open", "Open the account on this file", "按現有文件開戶");
            Both("decide.docs", "Ask for more documents only", "只要求補充文件");
            Both("decide.edd", "Do not open yet. Order enhanced due diligence", "暫不開戶，進行加強盡職審查");
            Both("decide.report", "Pause onboarding and escalate to compliance", "暫停開戶並上報合規");
            Both("decide.refuse", "Refuse the relationship", "拒絕建立業務關係");
            Both("decide.confirm", "Submit only if this is the action you want on the file.", "只有當這是你要留在檔案上的行動時才提交。");
            Both("decide.gap", "Gap still open: ", "仍有缺口：");

            Both("pause.lead", "The branch is paused. Nothing has been submitted.", "分行已暫停。尚未提交任何決定。");
            Both("pause.resume", "Resume", "繼續");
            Both("pause.hub", "Open the investigation centre", "前往調查中心");

            Both("notes.empty", "No marks yet. Open a document and mark an issue, or mark the chart.", "尚未有標記。請打開文件並標記問題，或在架構圖上標記。");
            Both("notes.reviewed", "Reviewed", "已審閱");
            Both("notes.marked", "Marked", "已標記");
            Both("notes.supplement", "Supplement requested", "已要求補充");

            Both("fb.score", "Learning score", "學習分數");
            Both("fb.docs", "Documents", "文件審查");
            Both("fb.owner", "Beneficial owner", "實益擁有人");
            Both("fb.funds", "Source of funds", "資金來源");
            Both("fb.business", "Business story", "業務合理性");
            Both("fb.decision", "Decision", "決策");
            Both("fb.hints", "Hints", "提示");
            Both("fb.time", "Time in the branch", "分行內所用時間");
            Both("fb.your", "Your action", "你的行動");
            Both("fb.bestTitle", "Action this exercise wants", "本演習希望的行動");
            Both("fb.best", "Do not open the account yet. Order enhanced due diligence: verify the natural person who owns or controls the company, the source of funds, and whether the business is real. If that explanation still fails, escalate to compliance and consider refusing the relationship. Record the reasons.", "暫不開戶。進行加強盡職審查：核實最終擁有或控制公司的自然人、資金來源，以及業務是否真實。若解釋仍然失敗，上報合規，並考慮拒絕建立關係。把理由記下來。");
            Both("fb.found", "Found", "已發現");
            Both("fb.missed", "Missed", "遺漏");
            Both("fb.flags", "Red flags", "紅旗");
            Both("fb.questions", "Questions", "提問");
            Both("fb.asked", "Asked", "已問");
            Both("fb.notAsked", "Not asked", "未問");
            Both("fb.steps", "What to do with a file like this", "同類檔案應如何處理");
            Both("fb.step1", "Do not open on the surface papers. A director and a 20 percent holding are not the beneficial owner.", "不要按表面文件開戶。董事身分與百分之二十持股並不是實益擁有人。");
            Both("fb.step2", "Record the address clash, the three-month company, the BVI majority, the mandate gap, and the funds gap.", "記下地址不符、成立僅約三個月、BVI 公司持有大部分股權、授權缺口，以及資金缺口。");
            Both("fb.step3", "Follow the chart past each company until you reach a natural person, then say that the person is not verified.", "沿架構圖穿過每一間公司，直到自然人，並說明該人尚未核實。");
            Both("fb.step4", "Order enhanced due diligence on that person, the funds, and the business. A document request alone does not finish this file.", "對該人、資金及業務進行加強盡職審查。只要求補文件並未完成這份檔案。");
            Both("fb.step5", "If the story still fails, escalate to compliance and consider refusal. This room only drafts a flag. It does not contact the Joint Financial Intelligence Unit.", "若說法仍然失敗，上報合規並考慮拒絕。此房間只草擬旗標，不會聯絡聯合財富情報組。");
            Both("fb.reason", "Your reason", "你的理由");
            Both("fb.pass.edd", "Passed. This is the action the exercise wants. The account stays unopened while enhanced due diligence runs.", "已通過。這是本演習希望的行動。加強盡職審查進行期間，戶口維持未開立。");
            Both("fb.pass.report", "Passed. Escalating fits a file that still does not explain the owner, the funds, or HR-7. The preferred first move is still enhanced due diligence, and this room only drafted a flag.", "已通過。在擁有人、資金或 HR-7 仍無法解釋時，上報符合規則。較可取的第一步仍是加強盡職審查。此房間只草擬了旗標。");
            Both("fb.pass.refuse", "Passed. Refusing is allowed when CDD cannot be completed, if you record why. This file still had room to order enhanced due diligence before a final refusal.", "已通過。無法完成盡職審查時可以拒絕，但要記錄理由。這份檔案仍有空間在最終拒絕之前先做加強盡職審查。");
            Both("fb.miss.docs", "Not passed. Asking for papers was the right kind of step, and the account was not opened. The portal does not treat the exercise as passed, because the owner and the funds were left unfinished.", "未通過。要求補交文件是正確的一類步驟，戶口也沒有開立。平台不把這次練習計為通過，因為擁有人與資金仍未處理。");
            Both("fb.miss.open", "Not passed. The account was opened while the beneficial owner and the source of funds were still unverified. Rule R1 says not to do that.", "未通過。實益擁有人與資金來源仍未核實，戶口卻已開立。規則 R1 要求不得這樣做。");
            Both("fb.none", "No action was recorded.", "沒有記到行動。");
            Both("gap.purpose", "purpose and expected volume were not both asked", "未同時問到開戶目的與預期交易量");
            Both("fb.policy", "CDD policy read", "已閱盡職審查政策");
            Both("gap.ubo", "the beneficial-owner question was not asked", "未問實益擁有人");
            Both("gap.sof", "the source-of-funds question was not asked", "未問資金來源");
            Both("gap.volume", "the volume question was not asked", "未問交易量");
            Both("gap.authority", "the authority question was not asked", "未問開戶授權");
            Both("gap.chart", "the chart was not followed to Mr A", "架構圖未追到甲先生");

            Both("flag.address", "The passport and the utility bill name different streets. Ask for an explanation and a document that matches.", "護照與水電單記載不同街道。應要求解釋，以及一份相符的文件。");
            Both("flag.young", "A company about three months old does not, by itself, prove a crime. It does mean you need more evidence of real business before a large cross-border account.", "成立約三個月本身不是罪行。它表示在開立大額跨境戶口之前，需要更多真實業務的證據。");
            Both("flag.bvi", "An 80 percent BVI holder is a layer, not an answer. Identify the natural person who owns or controls that layer.", "持股百分之八十的 BVI 公司是一層結構，不是答案。要識別擁有或控制該層的自然人。");
            Both("flag.ubo", "Mr A is the person the chart reaches. The file does not verify him, and Mr Li's claim to be the main shareholder conflicts with the 20 percent holding.", "甲先生是架構圖追到的人。檔案沒有核實他，而李先生自稱主要股東，與百分之二十的持股互相矛盾。");
            Both("flag.sof", "\"Savings and income\" is not evidence. Ask for records that can explain the size of the flow.", "「儲蓄及收入」不是證據。應要求能解釋流量規模的紀錄。");
            Both("flag.volume", "HKD 2,000,000 a month from the first month, with one person and no contracts on the table, does not match the young company.", "由第一個月起每月港幣二百萬，一人公司又沒有把合約帶來，與這間新公司並不相稱。");
            Both("flag.geo", "The client denied higher-risk business. The system note says counterparties touch policy code HR-7. Use the record, not the denial.", "客戶否認有較高風險地區的業務。系統紀錄卻寫交易對手觸及政策代號 HR-7。應採信紀錄，而不是那句否認。");
            Both("flag.mandate", "Authority to collect mail is not authority to open an account. Ask for a mandate that says so, or do not open.", "收取信件的授權不是開戶授權。應要求一份寫明可開戶的授權，否則不要開戶。");
            Both("flag.evasion", "He would not name the person behind the BVI company, and his answers about contracts did not match. Record the evasion. It is a reason to go further, not a reason to stop.", "他不願指出 BVI 公司背後的人，關於合約的答案也不一致。把迴避記下來。這是繼續追查的理由，不是停止的理由。");

            Both("t03.brief.title", "Topic 3  ·  Open a company account", "專題三　公司開戶");
            Both("t03.brief.goal", "You are a new relationship manager. A man called Mr Li wants to open an account for a company, Starlight Trading Limited. Everyone in the branch is fictional. Nothing here is a live bank system.\n\nBefore a bank opens a company account it does four checks. Together they are called customer due diligence, or CDD.\n\n1. Who the customer is. The customer is the company, and also the person in front of you.\n2. Who the beneficial owner is. That is the real person who ultimately owns or controls the company. A director is not automatically that person. If another company holds the shares, you have not finished.\n3. Where the money comes from. You need evidence. The word savings is not evidence.\n4. Whether the business makes sense. A very new, one-person company that wants to move a lot of money is a reason to slow down.\n\nA red flag is a fact that does not fit. It is not proof of a crime. It means you do not open the account yet.", "你是新入職的客戶經理。李先生要為星輝貿易有限公司開戶。分行裡的人都是虛構的。這裡不是真實銀行系統。\n\n銀行開立公司戶口之前要做四項檢查，合稱客戶盡職審查（CDD）。\n\n1. 客戶是誰。客戶是公司，也是面前的人。\n2. 實益擁有人是誰。那是最終擁有或控制公司的真人。董事不一定是那個人。若股份由另一間公司持有，審查還沒有完。\n3. 錢從哪裡來。你需要證據。「儲蓄」這個詞不是證據。\n4. 業務是否說得通。很新、只有一個人的公司要搬動大額資金，就是要放慢的理由。\n\n紅旗是一件對不上的事實。它不是犯罪證明。它表示你現在不要開戶。");
            Both("t03.brief.how", "How to play. Press Enter the branch. Hold the left mouse button to walk forward. Hold the right mouse button to walk backward. Move the mouse while a button is held to turn. Click an object to use it.\n\nFollow the cream panel that says Do this next. It tells you where to go. Open Words whenever a term is new.\n\nRead eight papers on the desk. Ask Mr Li the questions in the meeting room. Open the ownership chart and follow it until you reach a person. Then go to the blue-floor room and choose what the bank should do.\n\nWhat good looks like: you do not open the account on these papers. You order a deeper check, called enhanced due diligence, of the real owner, the money, and the business. If the story still fails, you pause and tell compliance, or you refuse. This room only records that choice.", "怎樣進行。按「進入分行」。按住左鍵向前走。按住右鍵後退。按住按鍵時移動滑鼠可以轉向。點擊物件即可互動。\n\n跟著寫著「下一步」的米色面板。它會告訴你去哪裡。遇到新詞就打開詞彙。\n\n閱讀櫃檯上的八份文件。在會客室向李先生提問。打開股權圖，一直追到一個人。然後到藍色地板的房間，選擇銀行應怎樣做。\n\n好的處理是：不要按這些文件開戶。對真正的擁有人、資金和業務做更深的檢查，稱為加強盡職審查。若說法仍然失敗，就暫停並告知合規，或拒絕。此房間只記錄這個選擇。");
            Both("t03.brief.note", "The result page explains every red flag in plain English, including the ones you missed. You can replay from there.", "結果頁會用淺白英文解釋每一項紅旗，包括你遺漏的。你可以從那裡再玩一次。");
            Both("t03.enter", "Enter the branch", "進入分行");
            Both("t03.feedback.title", "What the file needed", "這份檔案需要甚麼");
            Both("t03.feedback.record", "The card below is the training record written by the rules. It is not a live alert. Flag names are labels on that record.", "下方卡片是規則寫下的培訓紀錄，不是即時警報。旗標名稱是這份紀錄上的標籤。");
            Both("t03.replay", "Replay the branch", "再走一次分行");
            Both("hud.words", "Words", "詞彙");
            Both("hud.next", "Do this next", "下一步");
            Both("guide.title", "Before you walk in", "進場之前");
            Both("guide.start", "Start walking", "開始走動");
            Both("guide.body", "You are a new relationship manager. Mr Li wants to open a company account for Starlight Trading Limited. Everyone in this branch is fictional.\n\nA bank has to finish four checks before it opens a company account. Together those checks are called customer due diligence (CDD):\n\n1. Who the customer is. The customer is the company, and also the person standing in front of you.\n2. Who the beneficial owner is. That is the real person who ultimately owns or controls the company. A director is not automatically that person. Another company on the shareholder list is not the end of the check.\n3. Where the money comes from. You need evidence. A sentence such as \"savings\" is not evidence.\n4. Whether the business makes sense. A very new, one-person company that wants to move a lot of money is a reason to slow down.\n\nA red flag is a fact that does not fit. It is not proof of a crime. It means you do not open the account yet.\n\nHold the left mouse button to walk forward. Hold the right mouse button to walk backward. Move the mouse while a button is held to turn. Click an object to use it. The panel under the top bar always says what to do next. Words explains a term again.", "你是新入職的客戶經理。李先生要為星輝貿易有限公司開立公司戶口。分行內所有人都是虛構的。\n\n銀行在開立公司戶口之前，要完成四項審查。合起來稱為客戶盡職審查（CDD）：\n\n1. 客戶是誰。客戶是這間公司，也是站在你面前的人。\n2. 實益擁有人是誰。那是最終擁有或控制公司的真人。董事不一定就是那個人。股東名冊上的另一間公司，也不是審查的終點。\n3. 錢從哪裡來。你需要證據。「儲蓄」這一句並不是證據。\n4. 業務是否說得通。一間很新、只有一個人的公司，卻要搬動大額資金，就是要放慢的理由。\n\n紅旗是一件對不上的事實。它不是犯罪的證明。它表示你現在還不要開戶。\n\n按住左鍵向前走。按住右鍵後退。按住按鍵時移動滑鼠可以轉向。點擊物件即可互動。頂欄下方會一直告訴你下一步。詞彙可以再解釋一個用語。");
            Both("words.title", "Words for this lesson", "本課詞彙");
            Both("words.body", "Customer. The company asking to bank with you. Here, that is Starlight Trading Limited. Mr Li is only its representative.\n\nKYC (know your customer). Check that the person and the company are who they claim to be.\n\nCDD (customer due diligence). The checks you finish before you open an account: who they are, who owns them, what the account is for, and where the money comes from.\n\nBeneficial owner. The real person who ultimately owns or controls the company. Keep going past companies until you reach a person.\n\nRed flag. A fact that does not fit. Not proof of a crime. A reason to slow down and not open yet.\n\nSource of funds. Where the money actually came from, shown with records, not only with a sentence.\n\nEnhanced due diligence. A deeper check used when the first check is not enough. The account stays closed while you do it.\n\nMandate. A paper that says what the representative is allowed to sign. Collecting mail is not the same as opening an account.\n\nEscalate. Tell compliance and pause the application. This training room only writes that choice down. It does not call a regulator or the police.", "客戶。要求與你建立銀行關係的公司。這裡是星輝貿易有限公司。李先生只是代表。\n\nKYC（認識你的客戶）。核對這個人和這間公司是否就是他們所聲稱的身分。\n\nCDD（客戶盡職審查）。開戶前要做完的檢查：他們是誰、誰擁有他們、戶口用來做甚麼、錢從哪裡來。\n\n實益擁有人。最終擁有或控制公司的真人。要穿過一間又一間公司，直到追到一個人。\n\n紅旗。一件對不上的事實。不是犯罪證明。是放慢、暫不開戶的理由。\n\n資金來源。錢實際從哪裡來，要用紀錄證明，不能只靠一句話。\n\n加強盡職審查。第一項檢查不足時做的更深檢查。進行期間戶口保持不開。\n\n授權書。寫明代表可以簽署甚麼的文件。代收信件，並不等於可以開戶。\n\n上報。告知合規並暫停申請。這個培訓房間只把選擇寫下來。它不會致電監管機構或警方。");

            Both("coach.greet", "Walk to the blue figure in the lobby. That is Mr Li. Click him or press E. Ask what the account is for, and how much money will move each month. You need both answers. That is how a company check starts.", "走到大堂裡的藍色人像。那是李先生。點擊他或按 E。問帳戶用來做甚麼，以及每月會有多少資金進出。兩個答案都要。公司審查就是這樣開始。");
            Both("coach.invite", "You have the purpose and the amount. Click Mr Li again and invite him to the desk. The papers are the cream folders on the wooden counter to the right.", "你已經問到用途和金額。再點擊李先生，請他到櫃位。文件是右邊木櫃檯上的米色文件夾。");
            Both("coach.docs", "Go to the wooden counter on the right. Open each of the eight folders. Read the line Why this paper matters. If something does not fit, press Mark the issue. A red flag is not proof of a crime. It means slow down.", "到右邊的木櫃檯。打開八份文件夾。先讀「這份文件為何重要」。若有對不上的地方，按標記問題。紅旗不是犯罪證明。它表示要放慢。");
            Both("coach.ask", "Go through the doorway at the back of the lobby into the meeting room (the warmer floor). Click Mr Li. Ask who really owns the company, where the money comes from, why the amount is so large, and whether he is allowed to open the account. Do not ask the question marked Inappropriate.", "穿過大堂後方的門口，進入會客室（地板偏木色）。點擊李先生。問誰真正擁有公司、錢從哪裡來、金額為何這麼大，以及他是否有權開戶。不要問標成「不適當」的那一題。");
            Both("coach.chart", "In the meeting room, click the white board on the left wall. A beneficial owner is the real person at the end of the chain, not the first company and not the director. Click each box until you reach a person. Then mark that the person is not verified.", "在會客室點擊左牆的白色圖板。實益擁有人是這條鏈最後的真人，不是第一間公司，也不是董事。逐一點開，直到追到一個人。然後標記該人尚未核實。");
            Both("coach.computer", "Go back to the counter and click the blue screen on the right. That is the bank's own note. Compare it with what Mr Li said. If they disagree, trust the note.", "回到櫃檯，點擊右邊的藍色螢幕。那是銀行自己的紀錄。把它和李先生的說法比較。若兩者不同，採信紀錄。");
            Both("coach.funds", "Open the source-of-funds folder on the counter and mark it if the money is only described in a sentence. Savings, with no statement, is not evidence.", "打開櫃檯上的資金來源文件夾。若錢只用一句話描述，就標記它。只有「儲蓄」、沒有結單，並不是證據。");
            Both("coach.decide", "Walk to the back-right room. The floor there is blue. That is compliance. Click the grey figure. If the real owner, the money, or the business is still unclear, do not open the account. The usual next step is a deeper check, called enhanced due diligence.", "走到右後方的房間。那裡的地板是藍色的，是合規辦公室。點擊灰色人像。若真正的擁有人、資金或業務仍不清楚，不要開戶。通常的下一步是更深的檢查，稱為加強盡職審查。");

            Both("structure.lead", "Click a box to see who holds it. Do not stop when you see another company. A beneficial owner is a person. When you reach that person, mark that he is not verified.", "點擊方塊，看誰持有它。看到另一間公司時不要停。實益擁有人是一個人。追到那個人之後，標記他尚未核實。");
            Both("node.starlight.name", "1  ·  Starlight Trading Ltd, the applicant", "1  ·  星輝貿易有限公司，申請人");
            Both("node.li.name", "Mr Li  ·  20%  ·  director, not the end of the chain", "李先生  ·  20%  ·  董事，不是這條鏈的終點");
            Both("node.bvi.name", "2  ·  BVI Holding Ltd  ·  80%", "2  ·  BVI Holding Ltd  ·  80%");
            Both("node.seychelles.name", "3  ·  Seychelles company  ·  owns the BVI company", "3  ·  塞舌爾公司  ·  持有該 BVI 公司");
            Both("node.mr_a.name", "4  ·  Mr A  ·  the person at the end", "4  ·  甲先生  ·  鏈末端的人");

            Both("teach.passport", "Why this paper matters. A passport tells you which person is in the room. Check the address against the proof of address. They should match.", "這份文件為何重要。護照告訴你房間裡的是哪一個人。把地址和地址證明對一下。兩者應該相符。");
            Both("teach.address", "Why this paper matters. Proof of address should name the same home as the passport. Two different streets means you cannot yet be sure where he lives.", "這份文件為何重要。地址證明應與護照上的住址相同。兩條不同的街道，表示你還不能確定他住在哪裡。");
            Both("teach.br", "Why this paper matters. This shows the company exists and how old it is. A company only about three months old needs more evidence before a large account.", "這份文件為何重要。它證明公司存在，以及成立了多久。成立約三個月的公司，在開立大額戶口之前需要更多證據。");
            Both("teach.directors", "Why this paper matters. A director runs the company day to day. That job is not the same as being the person who ultimately owns it. There is no separate red flag on this page.", "這份文件為何重要。董事負責日常管理。這個職位並不等於最終擁有公司的人。這一頁本身沒有另一項紅旗。");
            Both("teach.members", "Why this paper matters. This is who holds the shares. If a company holds most of them, you have not finished. You still need the person behind that company.", "這份文件為何重要。這裡寫的是誰持有股份。若大部分由一間公司持有，審查還沒有完成。你仍要找到那間公司背後的人。");
            Both("teach.plan", "Why this paper matters. Read whether this business can explain the amount of money they want to move. One person, no buyers, and a very large monthly figure do not fit together.", "這份文件為何重要。看這門生意能否解釋他們想搬動的金額。一個人、沒有買家，再加上很大的每月數字，三者對不上。");
            Both("teach.funds", "Why this paper matters. Source of funds means where the money came from. You need records. The words savings and income, with no statement, are not records.", "這份文件為何重要。資金來源是指錢從哪裡來。你需要紀錄。只有「儲蓄」和「收入」、沒有結單，並不是紀錄。");
            Both("teach.mandate", "Why this paper matters. A mandate says what Mr Li is allowed to do for the company. Permission to collect mail is not permission to open a bank account.", "這份文件為何重要。授權書寫明李先生可以為公司做甚麼。代收信件的許可，並不是開立銀行戶口的許可。");

            Both("greet.why.service", "Why you ask. You need the purpose of the account. A company account for trade payments is a different check from a personal savings account.", "為何要問。你需要知道戶口的用途。用來支付貿易款項的公司戶口，和個人儲蓄戶口不是同一種檢查。");
            Both("greet.why.company", "Why you ask. The customer is the company. The man in front of you is only the representative until the papers show otherwise.", "為何要問。客戶是這間公司。在文件證明之前，面前這個人只是代表。");
            Both("greet.why.business", "Why you ask. You are testing whether a real business exists. Vague buyers are a reason to read the papers, not a reason to open.", "為何要問。你在看是否真有一門生意。含糊的買家是去讀文件的理由，不是開戶的理由。");
            Both("greet.why.volume", "Why you ask. This number is the expected activity. Later you compare it with how new and how small the company is.", "為何要問。這個數字是預期的活動量。稍後你要把它和公司有多新、多小作比較。");
            Both("ask.customers.why", "Why you ask. Named customers and suppliers are how you test that the business is real. \"Various buyers\" is not a list.", "為何要問。指名的客戶和供應商，用來判斷生意是否真實。「不同的買家」並不是一份名單。");
            Both("ask.sof.why", "Why you ask. Source of funds is where the money came from. If he cannot show records, you do not open yet.", "為何要問。資金來源是錢從哪裡來。若他拿不出紀錄，你現在不要開戶。");
            Both("ask.ubo.why", "Why you ask. You are looking for the beneficial owner: the real person behind the shares. \"I run it\" does not answer who owns it.", "為何要問。你在找實益擁有人，也就是股份背後的真人。「公司由我經營」並沒有回答誰擁有它。");
            Both("ask.volume.why", "Why you ask. A large figure needs a believable story. If his answers disagree, write that down. Disagreement is a red flag.", "為何要問。大額數字需要一個說得通的故事。若他的答案互相矛盾，記下來。矛盾就是一項紅旗。");
            Both("ask.geo.why", "Why you ask. Some places need a closer look under the bank's own policy. Compare his answer with the blue system note. Do not rely on a denial alone.", "為何要問。按銀行自己的政策，有些地區需要看得更仔細。把他的答案和藍色系統紀錄比較。不要只靠一句否認。");
            Both("ask.authority.why", "Why you ask. He can open the account only if the company has authorised him to. Check the mandate. A director is not automatically authorised.", "為何要問。只有公司授權了他，他才可以開戶。請核對授權書。董事並不自動擁有這項授權。");
            Both("ask.skip.why", "Why this question is inappropriate. It tells the client you will skip the checks. Do not ask it in a real review.", "為何這條問題不適當。它等於告訴客戶你會跳過審查。真正的審查不應這樣問。");
        }
    }
}
