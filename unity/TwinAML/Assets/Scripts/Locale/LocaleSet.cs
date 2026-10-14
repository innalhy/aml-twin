using System.Collections.Generic;

namespace TwinAml
{
    public enum LocaleCode
    {
        En,
        Zh
    }

    public static class Locale
    {
        public static LocaleCode Current = LocaleCode.En;

        static readonly Dictionary<string, string> En = new Dictionary<string, string>();
        static readonly Dictionary<string, string> Zh = new Dictionary<string, string>();

        static Locale()
        {
            E("lang.switch", "繁體中文");
            Z("lang.switch", "English");
            E("banner", "SYNTHETIC TRAINING — NOT A BANK CONNECTION");
            Z("banner", "合成培訓 — 並未連接任何銀行");
            E("footer", "Office wall panel  ·  pre-authored script  ·  rules before AI");
            Z("footer", "辦公室牆面板  ·  預先編寫劇本  ·  規則先於模型");
            E("next", "Continue");
            Z("next", "繼續");
            E("back.hub", "Back to topics");
            Z("back.hub", "返回專題");
            E("back.meeting", "Back to the meeting");
            Z("back.meeting", "返回視像會議");
            E("back.inbox", "Back to the inbox");
            Z("back.inbox", "返回收件匣");
            E("back.statement", "Back to the statement");
            Z("back.statement", "返回客戶說法");
            E("open.dashboard", "Open dashboard");
            Z("open.dashboard", "開啟儀表板");
            E("nav.dashboard", "Dashboard");
            Z("nav.dashboard", "儀表板");
            E("nav.settings", "Settings");
            Z("nav.settings", "設定");

            E("boot.kicker", "COMP3424  ·  TwinAML");
            Z("boot.kicker", "COMP3424  ·  TwinAML");
            E("boot.title", "Compliance training room");
            Z("boot.title", "合規培訓室");
            E("boot.body", "This is a synthetic anti-money-laundering exercise. The bank screens in this room are training props. They are not connected to a bank, a regulator, or the Joint Financial Intelligence Unit.");
            Z("boot.body", "本室為合成反洗錢練習。畫面中的銀行介面僅供培訓，並未連接任何銀行、監管機構或聯合財富情報組。");
            E("boot.continue", "Continue");
            Z("boot.continue", "繼續");

            E("login.title", "Trainee sign-in");
            Z("login.title", "學員登入");
            E("login.hint", "Display name. It is stored only in this training record on this machine.");
            Z("login.hint", "請輸入顯示名稱。此名稱只寫入本機練習紀錄，不會送往任何銀行。");
            E("login.placeholder", "Name");
            Z("login.placeholder", "姓名");
            E("login.enter", "Enter the training room");
            Z("login.enter", "進入培訓室");
            E("login.note", "Content is pre-authored. Rules decide the outcome. This build does not generate video and does not hold real customer data.");
            Z("login.note", "內容均為預先編寫。合規結果由規則決定。本版本不會生成視像，也不載有真實客戶資料。");

            E("intro.title", "The room");
            Z("intro.title", "訓練室說明");
            E("intro.body", "You stay in one office. Wall panels are the exercise. Topic 1 is a deepfake video: confirming the payment is the trap, and holding the payment to report it is the pass. Topic 2 is a mule account and a mixer: A is a miss, and B, C, and D are passes — enhanced due diligence, an outbound hold, and a draft suspicious transaction report. The dashboard reads the twin written by those choices.");
            Z("intro.body", "學員留在同一間辦公室內。牆上面板即為練習介面。專題一為深偽視像：確認付款屬於陷阱，暫停並舉報屬於通過。專題二為人頭戶與混幣：選項 A 屬於失誤；選項 B、C、D 屬於通過，分別為加強盡職審查、暫停出帳，以及草擬可疑交易報告。儀表板只讀取上述選擇寫入的孿生狀態。");

            E("hub.title", "Topics");
            Z("hub.title", "專題");
            E("hub.lead", "Both start buttons open a synthetic exercise. Nothing on this wall is a live bank system.");
            Z("hub.lead", "兩枚開始按鈕均進入合成練習。此牆面並非真實銀行系統。");
            E("hub.t01.title", "Topic 1  ·  Deepfake video");
            Z("hub.t01.title", "專題一　深偽視像");
            E("hub.t01.body", "Case deepfake-hk-001. A video image is not authority to pay. Confirming the payment is the trap. Holding and reporting is the pass.");
            Z("hub.t01.body", "個案 deepfake-hk-001。視像不足以作為付款授權。確認付款屬於陷阱；暫停並舉報屬於通過。");
            E("hub.t02.title", "Topic 2  ·  Mule account and mixer");
            Z("hub.t02.title", "專題二　人頭戶與混幣");
            E("hub.t02.body", "Case hk-greythunder-mule-001. A is a miss. B, C, and D are passes: enhanced due diligence, an outbound hold, and a draft suspicious transaction report.");
            Z("hub.t02.body", "個案 hk-greythunder-mule-001。選項 A 屬於失誤。選項 B、C、D 屬於通過，分別為加強盡職審查、暫停出帳，以及草擬可疑交易報告。");
            E("hub.start", "Start");
            Z("hub.start", "開始");
            E("hub.done", "Completed exercises on this machine");
            Z("hub.done", "本機已完成練習");

            E("t01.brief.title", "Topic 1 brief");
            Z("t01.brief.title", "專題一　簡報");
            E("t01.brief.goal", "Training goal: do not treat the face on the video as payment authority. Confirming the payment loses the funds. The pass is to withhold trust, stop the payment, and leave a compliance record.");
            Z("t01.brief.goal", "訓練目標：不得以視像中的人像作為付款授權。確認付款將導致資金離開。通過的處理是不予信任、停止付款，並留下合規紀錄。");
            E("t01.inbox.title", "Inbox");
            Z("t01.inbox.title", "收件匣");
            E("t01.inbox.from", "From: Synthetic CFO (deepfake exercise)");
            Z("t01.inbox.from", "寄件人：合成財務總監（深偽演習）");
            E("t01.inbox.subject", "Subject: Confidential acquisition — please release the payment now");
            Z("t01.inbox.subject", "主旨：機密收購 — 請即時放款");
            E("t01.inbox.body", "The message asks you to pay a new beneficiary today and not to call anyone, because the matter is confidential. The reserved callback number is not used in the message. This mailbox is a training prop.");
            Z("t01.inbox.body", "來信要求今日向一名新受益人放款，並稱事宜機密，不必致電任何人。來信並未使用預先登記的回撥號碼。此信箱為培訓道具。");
            E("t01.meeting.title", "Meeting");
            Z("t01.meeting.title", "視像會議");
            E("t01.meeting.lead", "The person on the video repeats the payment instruction. A video image is not an independent check.");
            Z("t01.meeting.lead", "視像中的人士複述付款指示。視像人像並非獨立核實。");
            E("t01.meeting.pay", "Go to the payment desk");
            Z("t01.meeting.pay", "前往付款櫃檯");
            E("t01.meeting.report", "Go to hold and report");
            Z("t01.meeting.report", "前往暫停並舉報");
            E("t01.media.missing", "Video slot. The clip is not on this machine. The exercise continues. Phase 1 does not generate a video.");
            Z("t01.media.missing", "視像位置。本機沒有該片段，練習仍可繼續。第一階段不會生成視像。");
            E("t01.media.found", "Video slot. A local clip was found and is shown here. It is training media, not a live feed.");
            Z("t01.media.found", "視像位置。本機找到片段並在此播放。此為培訓媒體，並非即時連線。");
            E("t01.pay.title", "Payment desk");
            Z("t01.pay.title", "付款櫃檯");
            E("t01.pay.form", "From desk: SYN-DESK-DF-01\nBeneficiary: SYN-PAYEE-DF-01\nAmount: HKD 480,000\nReference: confidential acquisition (exercise)\nAll of these identifiers are synthetic.");
            Z("t01.pay.form", "付款櫃檯：SYN-DESK-DF-01\n受益人：SYN-PAYEE-DF-01\n金額：港幣 480,000 元\n備註：機密收購（演習）\n上述編號均為合成資料。");
            E("t01.choice.pay", "Confirm payment");
            Z("t01.choice.pay", "確認付款");
            E("t01.choice.pay.detail", "Trap. The script records pass_video, then clear_alert.");
            Z("t01.choice.pay.detail", "陷阱。劇本依序記錄 pass_video、clear_alert。");
            E("t01.report.title", "Hold and report");
            Z("t01.report.title", "暫停並舉報");
            E("t01.report.body", "Do not trust the video. Use the reserved callback channel and do not single-approve the payment. In this frozen script the matching acceptable ending is a rule block: the account is not opened, so no suspicious-transaction-report draft is written here. Drafting that report is Topic 2.");
            Z("t01.report.body", "對該視像不予信任。請使用預先登記的回撥渠道，不要由單一人員確認付款。在本凍結劇本中，對應的可接受結局是規則截停：戶口不會開啟，因此此處不會寫入可疑交易報告草稿。草擬該報告屬於專題二。");
            E("t01.choice.report", "Hold and report");
            Z("t01.choice.report", "暫停並舉報");
            E("t01.choice.report.detail", "Pass. The script records redo_liveness, then follow_r1. called_back and dual_approval are written on the session.");
            Z("t01.choice.report.detail", "通過。劇本依序記錄 redo_liveness、follow_r1。工作階段會寫入 called_back 與 dual_approval。");
            E("t01.trap.title", "Trap — payment confirmed");
            Z("t01.trap.title", "陷阱 — 已確認付款");
            E("t01.trap.body", "The funds leave on the false instruction. The script disposition is a poor path. The dashboard now shows funds at risk.");
            Z("t01.trap.body", "資金已按錯誤指示離開。劇本結局屬於較差路徑。儀表板現顯示資金處於風險。");
            E("t01.pass.title", "Pass — payment not confirmed");
            Z("t01.pass.title", "通過 — 未確認付款");
            E("t01.pass.body", "You did not confirm the payment. The next panel explains what the twin recorded.");
            Z("t01.pass.body", "你沒有確認付款。下一面板說明孿生狀態所記錄的內容。");
            E("t01.teach.title", "What the rule recorded");
            Z("t01.teach.title", "規則所記錄的內容");
            E("t01.teach.body", "Rules decide before any model. Withholding trust is the pass: the video was checked again, and rule R1 stopped onboarding. The session marks a callback and dual control because you refused a single approval from the video. The frozen script does not draft a suspicious transaction report on this ending, because the account was never opened. A suspicious transaction report (STR) is a report an institution prepares for a suspicious transaction. In practice it is filed with the Joint Financial Intelligence Unit. This room never files one. Topic 2 is where a draft STR is written onto the twin.");
            Z("t01.teach.body", "規則先於任何模型作出決定。不予信任即為通過：視像經再次核對後，規則 R1 截停開戶。由於你拒絕以該視像作單一確認，工作階段記為已回撥並已雙重覆核。此結局不會草擬可疑交易報告，因為戶口從未開啟。可疑交易報告（Suspicious Transaction Report，簡稱 STR）是機構就可疑交易擬備的報告，實務上提交予聯合財富情報組。本室不會實際提交。專題二才會把可疑交易報告草稿寫入孿生狀態。");

            E("t02.brief.title", "Topic 2 brief");
            Z("t02.brief.title", "專題二　簡報");
            E("t02.brief.goal", "Training goal: read the mule-cluster link, the customer's story, and the funds path together. Clearing the case as a friend's investment is the miss. Enhanced due diligence, an outbound hold, and a draft suspicious transaction report are passes.");
            Z("t02.brief.goal", "訓練目標：一併閱讀人頭戶群組連繫、客戶說法與資金路徑。把個案結為朋友投資屬於失誤。加強盡職審查、暫停出帳，以及草擬可疑交易報告屬於通過。");
            E("t02.brief.map", "This room uses hk-greythunder-mule-001. The mixer diagram on the chain panel is the course teaching picture for mule accounts and a mixer. It is not a second script. The twin is updated only by that case file's patches.");
            Z("t02.brief.map", "本室使用 hk-greythunder-mule-001。資金路徑面板上的混幣圖是人頭戶與混幣的課程教學示意，並非第二套劇本。孿生狀態只會按該個案檔案的補丁更新。");
            E("t02.statement.title", "Customer statement");
            Z("t02.statement.title", "客戶說法");
            E("t02.statement.note", "Read the script scene below. Choosing A later skips this story node in the script, which is the miss. B, C, and D keep the story on the twin.");
            Z("t02.statement.note", "請閱讀下列劇本場景。若其後選擇 A，劇本會跳過此說法節點，該選擇屬於失誤。選擇 B、C、D 會把說法留在孿生狀態。");
            E("t02.chain.title", "Funds path");
            Z("t02.chain.title", "資金路徑");
            E("t02.chain.note", "Teaching picture only. The rows under it are the case file's own scene. They are written onto the twin when your choice enters that scene.");
            Z("t02.chain.note", "以下為教學示意。其下各列來自個案檔案本身的場景，會在你的選擇進入該場景時寫入孿生狀態。");
            E("t02.chain.hops", "1. Victim funds enter a first-layer mule account.\n2. The controller sends them on to a second or third layer.\n3. The funds are withdrawn, used to buy crypto, or sent overseas.\n4. The offender deposits the crypto into a mixer.\n5. The mixer splits and mixes funds from many users.\n6. An equivalent amount is paid to a new address. The direct on-chain link is broken.");
            Z("t02.chain.hops", "1. 受害人資金進入第一層人頭戶。\n2. 控制者迅速把資金轉至第二層或第三層戶口。\n3. 資金被提取、用於購買加密貨幣，或轉往海外。\n4. 犯罪者把涉案加密貨幣存入混幣器。\n5. 混幣器拆分並混合多名用戶的資金。\n6. 等值款項付至一個新地址，鏈上直接對應關係被切斷。");
            E("t02.decision.title", "Decision");
            Z("t02.decision.title", "決定");
            E("t02.decision.lead", "Choose one. A is the trap. B, C, and D are passes. The buttons below write the frozen script, then the dashboard.");
            Z("t02.decision.lead", "請選擇一項。A 屬於陷阱。B、C、D 屬於通過。下列按鈕會先寫入凍結劇本，再寫入儀表板。");
            E("t02.str.gloss", "A suspicious transaction report (STR) is the report an institution prepares when a transaction is suspicious. In Hong Kong practice it is submitted to the Joint Financial Intelligence Unit. Choosing D drafts that report on the synthetic twin only. This room does not submit it.");
            Z("t02.str.gloss", "可疑交易報告（Suspicious Transaction Report，簡稱 STR）是機構在交易可疑時擬備的報告。按香港實務，該報告提交予聯合財富情報組。選擇 D 只會在合成孿生狀態中草擬該報告。本室不會實際提交。");
            E("t02.choice.a", "A   Close as a normal investment");
            Z("t02.choice.a", "A　結為正常投資");
            E("t02.choice.a.detail", "Trap. Script: release_friend → clear_friend.");
            Z("t02.choice.a.detail", "陷阱。劇本：release_friend → clear_friend。");
            E("t02.choice.b", "B   Enhanced due diligence");
            Z("t02.choice.b", "B　加強盡職審查");
            E("t02.choice.b.detail", "Pass. Script: edd_cluster → hold → exit_rel. Asks for a deeper review, holds outbound payments, then exits the relationship.");
            Z("t02.choice.b.detail", "通過。劇本：edd_cluster → hold → exit_rel。先作加強審查，暫停出帳，其後退出客戶關係。");
            E("t02.choice.c", "C   Hold outbound payments");
            Z("t02.choice.c", "C　暫停出帳");
            E("t02.choice.c.detail", "Pass. Script: restrict → hold → exit_rel. The outbound hold is placed before the story is accepted.");
            Z("t02.choice.c.detail", "通過。劇本：restrict → hold → exit_rel。在接受說法之前已暫停出帳。");
            E("t02.choice.d", "D   Draft a suspicious transaction report");
            Z("t02.choice.d", "D　草擬可疑交易報告");
            E("t02.choice.d.detail", "Pass. Script: edd_cluster → hold → str_freeze. Drafts the STR and recommends a freeze.");
            Z("t02.choice.d.detail", "通過。劇本：edd_cluster → hold → str_freeze。草擬可疑交易報告，並建議凍結。");
            E("t02.feedback.a.title", "Feedback — miss");
            Z("t02.feedback.a.title", "回饋 — 失誤");
            E("t02.feedback.a.body", "The cluster was cleared as a friend's investment. Rule R2 was ignored, so the dashboard marks the funds at risk. The customer's story node was not written, because this path skips it.");
            Z("t02.feedback.a.body", "群組連繫被當成朋友投資而結案。規則 R2 被忽略，儀表板因此把資金標為有風險。客戶說法節點沒有寫入，因為此路徑跳過該節點。");
            E("t02.feedback.pass.title", "Feedback — pass");
            Z("t02.feedback.pass.title", "回饋 — 通過");
            E("t02.feedback.pass.body", "This ending is an acceptable disposition on hk-greythunder-mule-001. The twin below is what the script patches wrote.");
            Z("t02.feedback.pass.body", "此結局屬於 hk-greythunder-mule-001 的可接受處置。下列孿生狀態由劇本補丁寫入。");

            E("dash.title", "Dashboard");
            Z("dash.title", "儀表板");
            E("dash.empty", "No exercise has been completed on this machine yet. Trap rate and reaction time stay blank until the first choice is submitted.");
            Z("dash.empty", "本機尚未完成任何練習。出錯率與反應時間會在首次提交選擇後才計算。");
            E("dash.rate", "Trap rate");
            Z("dash.rate", "出錯率");
            E("dash.reaction", "Mean reaction time");
            Z("dash.reaction", "平均反應時間");
            E("dash.latest", "Latest twin");
            Z("dash.latest", "最近一次孿生狀態");
            E("dash.history", "Completed exercises");
            Z("dash.history", "已完成練習");
            E("dash.file", "Local snapshot");
            Z("dash.file", "本機快照");
            E("dash.open", "An exercise is open and no choice has been written yet. The figures below are the cloned opening state, not a finished result.");
            Z("dash.open", "有一項練習進行中，尚未寫入選擇。下列數字是開局狀態的複本，並非已完成結果。");
            E("field.funds", "funds_risk");
            Z("field.funds", "funds_risk　資金風險");
            E("field.callback", "called_back");
            Z("field.callback", "called_back　已回撥");
            E("field.dual", "dual_approval");
            Z("field.dual", "dual_approval　雙重覆核");
            E("field.str", "str_filed");
            Z("field.str", "str_filed　已草擬可疑交易報告");
            E("field.disposition", "Disposition");
            Z("field.disposition", "處置");
            E("field.phase", "Phase");
            Z("field.phase", "階段");
            E("field.score", "Risk score");
            Z("field.score", "風險分數");
            E("field.flags", "Flags");
            Z("field.flags", "旗標");
            E("field.kyc", "KYC status");
            Z("field.kyc", "盡職審查狀態");
            E("field.choice", "Choice");
            Z("field.choice", "選擇");
            E("field.reaction", "Reaction time");
            Z("field.reaction", "反應時間");
            E("yes", "yes");
            Z("yes", "是");
            E("no", "no");
            Z("no", "否");
            E("none", "—");
            Z("none", "—");

            E("settings.title", "Settings");
            Z("settings.title", "設定");
            E("settings.body", "Language for the room chrome. Case prompts stay in the Traditional Chinese of the script file. This page does not connect to a bank.");
            Z("settings.body", "此處設定訓練室介面語言。個案提示維持劇本檔案中的繁體中文。本頁不會連接任何銀行。");
            E("settings.en", "English");
            Z("settings.en", "English　英文");
            E("settings.zh", "Traditional Chinese");
            Z("settings.zh", "繁體中文");
            E("error.title", "The case file did not load");
            Z("error.title", "未能讀取個案檔案");
            E("script.heading", "Script text");
            Z("script.heading", "劇本原文");
            E("script.tx", "Transactions named in the script scene");
            Z("script.tx", "劇本場景所列交易");
            E("written", "The dashboard snapshot was written on this machine.");
            Z("written", "儀表板快照已寫入本機。");
        }

        public static string T(string key)
        {
            var table = Current == LocaleCode.Zh ? Zh : En;
            if (table.TryGetValue(key, out var value)) return value;
            return key;
        }

        static void E(string key, string value) { En[key] = value; }
        static void Z(string key, string value) { Zh[key] = value; }
    }
}
