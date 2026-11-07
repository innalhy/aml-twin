using System.IO;
using System.Text;
using UnityEngine;

namespace TwinAml
{
    public static class ScreenBuilder
    {
        public static void Build(SceneId id)
        {
            if (id == SceneId.Scn_Dashboard)
            {
                PortalDashboard.Build();
                return;
            }
            if (id == SceneId.Scn_T03_Branch || SceneCatalog.IsBranchRoom(id))
            {
                BranchRoom.Enter();
                return;
            }
            if (id == SceneId.Scn_T04_Room || SceneCatalog.IsTriageRoom(id))
            {
                TriageRoom.Open();
                return;
            }
            var flow = FlowController.Instance;
            UiKit.BuildShell(id);
            switch (id)
            {
                case SceneId.Scn_Boot: Boot(); break;
                case SceneId.Scn_Login: Login(); break;
                case SceneId.Scn_Intro: Intro(); break;
                case SceneId.Scn_TopicsHub: Hub(); break;
                case SceneId.Scn_Settings: Settings(); break;
                case SceneId.Scn_T01_Brief: TopicBrief("T01"); break;
                case SceneId.Scn_T01_Inbox: Inbox(); break;
                case SceneId.Scn_T01_Meeting: Meeting(); break;
                case SceneId.Scn_T01_PayDesk: PayDesk(); break;
                case SceneId.Scn_T01_Report: Report(); break;
                case SceneId.Scn_T01_Trap: Outcome("t01.trap.title", "t01.trap.body", false); break;
                case SceneId.Scn_T01_Pass: Pass(); break;
                case SceneId.Scn_T01_Teach: Teach(); break;
                case SceneId.Scn_T02_Brief: TopicBrief("T02"); break;
                case SceneId.Scn_T02_Statement: Statement(); break;
                case SceneId.Scn_T02_Chain: Chain(); break;
                case SceneId.Scn_T02_Decision: Decision(); break;
                case SceneId.Scn_T02_FeedbackA: Outcome("t02.feedback.a.title", "t02.feedback.a.body", false); break;
                case SceneId.Scn_T02_FeedbackPass: Outcome("t02.feedback.pass.title", "t02.feedback.pass.body", false); break;
                case SceneId.Scn_T03_Brief: BranchBrief(); break;
                case SceneId.Scn_T03_Feedback: BranchFeedback(); break;
                case SceneId.Scn_T04_Brief: TriageBrief(); break;
                case SceneId.Scn_T04_Report: TriageReport(); break;
                default: Boot(); break;
            }
            if (flow != null && !string.IsNullOrEmpty(flow.LastError) && IsExercise(id))
            {
                UiKit.Gap(8f);
                UiKit.BeginCard();
                UiKit.Heading(Locale.T("error.title"));
                UiKit.Body(flow.LastError);
                UiKit.EndCard();
            }
            UiKit.Finish();
            if (id == SceneId.Scn_T01_PayDesk || id == SceneId.Scn_T01_Report || id == SceneId.Scn_T02_Decision)
            {
                if (flow != null) flow.ArmChoiceClock();
            }
        }

        static void Boot()
        {
            UiKit.Gap(12f);
            UiKit.Note(Locale.T("boot.kicker"));
            UiKit.Title(Locale.T("boot.title"));
            UiKit.Body(Locale.T("boot.body"));
            UiKit.Gap(8f);
            UiKit.Button(Locale.T("boot.continue"), Btn.Slate, () => FlowController.Instance.Go(SceneId.Scn_Login));
        }

        static void Login()
        {
            var flow = FlowController.Instance;
            UiKit.Title(Locale.T("login.title"));
            UiKit.Body(Locale.T("login.hint"));
            UiKit.Input(flow.Trainee, Locale.T("login.placeholder"), value => flow.Trainee = value);
            UiKit.Button(Locale.T("login.enter"), Btn.Slate, () =>
            {
                if (string.IsNullOrEmpty(flow.Trainee) || string.IsNullOrEmpty(flow.Trainee.Trim()))
                    flow.Trainee = "Trainee";
                else
                    flow.Trainee = flow.Trainee.Trim();
                flow.Go(SceneId.Scn_Intro);
            });
            UiKit.Note(Locale.T("login.note"));
        }

        static void Intro()
        {
            UiKit.Title(Locale.T("intro.title"));
            UiKit.Body(Locale.T("intro.body"));
            UiKit.Button(Locale.T("next"), Btn.Slate, () => FlowController.Instance.Go(SceneId.Scn_TopicsHub));
        }

        static void Hub()
        {
            var flow = FlowController.Instance;
            UiKit.Title(Locale.T("hub.title"));
            UiKit.Body(Locale.T("hub.lead"));
            UiKit.BeginCard();
            UiKit.Heading(Locale.T("hub.t01.title"));
            UiKit.Body(Locale.T("hub.t01.body"));
            UiKit.Button(Locale.T("hub.start"), Btn.Orange, () =>
            {
                flow.StartTopic("T01");
                flow.Go(SceneId.Scn_T01_Brief);
            });
            UiKit.EndCard();
            UiKit.BeginCard();
            UiKit.Heading(Locale.T("hub.t02.title"));
            UiKit.Body(Locale.T("hub.t02.body"));
            UiKit.Button(Locale.T("hub.start"), Btn.Orange, () =>
            {
                flow.StartTopic("T02");
                flow.Go(SceneId.Scn_T02_Brief);
            });
            UiKit.EndCard();
            UiKit.BeginCard();
            UiKit.Heading(Locale.T("hub.t03.title"));
            UiKit.Body(Locale.T("hub.t03.body"));
            UiKit.Button(Locale.T("hub.start"), Btn.Orange, () =>
            {
                flow.StartTopic("T03");
                flow.Go(SceneId.Scn_T03_Brief);
            });
            UiKit.EndCard();
            UiKit.BeginCard();
            UiKit.Heading(Locale.T("hub.t04.title"));
            UiKit.Body(Locale.T("hub.t04.body"));
            UiKit.Button(Locale.T("hub.start"), Btn.Orange, () =>
            {
                flow.StartTopic("T04");
                flow.Go(SceneId.Scn_T04_Brief);
            });
            if (TriageShift.Alerts.Count == 6 && !TriageShift.Finished && flow.Session != null && flow.Session.Topic == "T04" && flow.Session.Script != null)
                UiKit.Button(Locale.T("hub.t04.resume"), Btn.Soft, () => flow.Go(SceneId.Scn_T04_Room));
            UiKit.EndCard();
            UiKit.ButtonRow(
                Locale.T("nav.dashboard"), Btn.Soft, () => flow.Go(SceneId.Scn_Dashboard),
                Locale.T("nav.settings"), Btn.Soft, () => flow.Go(SceneId.Scn_Settings));
            UiKit.Note(Locale.T("hub.done") + ": " + flow.Completed.Count);
        }

        static void BranchBrief()
        {
            var flow = FlowController.Instance;
            UiKit.Title(BranchCopy.T("t03.brief.title"));
            UiKit.Body(BranchCopy.T("t03.brief.goal"));
            UiKit.Body(BranchCopy.T("t03.brief.how"));
            UiKit.Note(BranchCopy.T("t03.brief.note"));
            UiKit.Button(BranchCopy.T("t03.enter"), Btn.Slate, () => flow.Go(SceneId.Scn_T03_Branch));
            UiKit.Button(Locale.T("back.hub"), Btn.Soft, () => flow.Go(SceneId.Scn_TopicsHub));
        }

        static void BranchFeedback()
        {
            var flow = FlowController.Instance;
            var choice = "";
            if (flow != null && flow.Session != null && flow.Session.LastChoice != null)
                choice = flow.Session.LastChoice.ChoiceId;
            UiKit.Title(BranchCopy.T("t03.feedback.title"));
            UiKit.Body(BranchProgress.Feedback(choice));
            UiKit.Note(BranchCopy.T("t03.feedback.record"));
            TwinCard();
            UiKit.Button(BranchCopy.T("t03.replay"), Btn.Slate, () =>
            {
                flow.StartTopic("T03");
                flow.Go(SceneId.Scn_T03_Brief);
            });
            UiKit.ButtonRow(
                Locale.T("back.hub"), Btn.Soft, () => flow.Go(SceneId.Scn_TopicsHub),
                Locale.T("open.dashboard"), Btn.Slate, () => flow.Go(SceneId.Scn_Dashboard));
        }

        static void TriageBrief()
        {
            var flow = FlowController.Instance;
            UiKit.Title(Locale.T("t04.brief.title"));
            UiKit.Body(Locale.T("t04.brief.goal"));
            UiKit.Body(Locale.T("t04.brief.how"));
            UiKit.Body(Locale.T("t04.brief.paths"));
            UiKit.Body(Locale.T("t04.brief.tip"));
            var session = flow.Session;
            if (session != null && session.Script != null)
            {
                UiKit.BeginCard();
                UiKit.Heading(Locale.T("script.heading"));
                UiKit.Body(session.CaseTitle);
                var summary = session.Script.Get("summary");
                if (summary != null && summary.Kind == JsonKind.String) UiKit.Body(summary.String);
                UiKit.Body(RulesText(session.Script));
                UiKit.Note(CaseLibrary.ScriptPath(session.CaseId));
                var alertsPath = CaseLibrary.AlertsPath(session.CaseId);
                if (!string.IsNullOrEmpty(alertsPath)) UiKit.Note(alertsPath);
                UiKit.EndCard();
            }
            UiKit.Button(Locale.T("t04.enter"), Btn.Orange, () => flow.Go(SceneId.Scn_T04_Room));
            UiKit.Button(Locale.T("back.hub"), Btn.Soft, () => flow.Go(SceneId.Scn_TopicsHub));
        }

        static void TriageReport()
        {
            var flow = FlowController.Instance;
            UiKit.Title(Locale.T("t04.report.title"));
            var score = TriageShift.Score;
            if (score == null || !TriageShift.Finished)
            {
                UiKit.Body(Locale.T("t04.report.empty"));
                UiKit.Button(Locale.T("t04.enter"), Btn.Orange, () => flow.Go(SceneId.Scn_T04_Room));
                UiKit.Button(Locale.T("back.hub"), Btn.Soft, () => flow.Go(SceneId.Scn_TopicsHub));
                return;
            }
            UiKit.Body(score.Verdict);
            UiKit.Body(score.ScoreLine);
            UiKit.Body(score.TimeLine);
            UiKit.Body(score.Suggestion);
            for (var i = 0; i < score.Lines.Count; i++) UiKit.Body(score.Lines[i]);
            UiKit.Note("Do not tell a customer that an STR was drafted or might be drafted. This room only writes a training flag.");
            if (flow.Session != null && !string.IsNullOrEmpty(flow.Session.MappingNote))
                UiKit.Note(flow.Session.MappingNote);
            UiKit.Button(Locale.T("t04.again"), Btn.Orange, () =>
            {
                flow.StartTopic("T04");
                flow.Go(SceneId.Scn_T04_Brief);
            });
            UiKit.ButtonRow(
                Locale.T("back.hub"), Btn.Soft, () => flow.Go(SceneId.Scn_TopicsHub),
                Locale.T("open.dashboard"), Btn.Slate, () => flow.Go(SceneId.Scn_Dashboard));
        }

        static void TopicBrief(string topic)
        {
            var flow = FlowController.Instance;
            var t01 = topic == "T01";
            UiKit.Title(Locale.T(t01 ? "t01.brief.title" : "t02.brief.title"));
            UiKit.Body(Locale.T(t01 ? "t01.brief.goal" : "t02.brief.goal"));
            if (!t01) UiKit.Body(Locale.T("t02.brief.map"));
            var session = flow.Session;
            if (session != null && session.Script != null)
            {
                UiKit.BeginCard();
                UiKit.Heading(Locale.T("script.heading"));
                UiKit.Body(session.CaseTitle);
                var summary = session.Script.Get("summary");
                if (summary != null && summary.Kind == JsonKind.String) UiKit.Body(summary.String);
                UiKit.Note(CustomerLine(session.Script));
                UiKit.Body(RulesText(session.Script));
                UiKit.Note(CaseLibrary.ScriptPath(session.CaseId));
                UiKit.EndCard();
            }
            UiKit.Button(Locale.T("next"), Btn.Slate, () =>
                flow.Go(t01 ? SceneId.Scn_T01_Inbox : SceneId.Scn_T02_Statement));
            UiKit.Button(Locale.T("back.hub"), Btn.Soft, () => flow.Go(SceneId.Scn_TopicsHub));
        }

        static void Inbox()
        {
            var flow = FlowController.Instance;
            UiKit.Title(Locale.T("t01.inbox.title"));
            UiKit.BeginCard();
            UiKit.Note(Locale.T("t01.inbox.from"));
            UiKit.Heading(Locale.T("t01.inbox.subject"));
            UiKit.Body(Locale.T("t01.inbox.body"));
            UiKit.EndCard();
            Quote("n_intake");
            UiKit.Button(Locale.T("next"), Btn.Slate, () => flow.Go(SceneId.Scn_T01_Meeting));
            UiKit.Button(Locale.T("back.hub"), Btn.Soft, () => flow.Go(SceneId.Scn_TopicsHub));
        }

        static void Meeting()
        {
            var flow = FlowController.Instance;
            UiKit.Title(Locale.T("t01.meeting.title"));
            UiKit.Body(Locale.T("t01.meeting.lead"));
            var media = "data/media/deepfake-hk-001/kyc-clip.mp4";
            var script = flow.Session != null ? flow.Session.Script : null;
            var intake = script != null ? CaseLibrary.FindNode(script, "n_intake") : null;
            if (intake != null)
            {
                var mediaRef = intake.Get("media_ref");
                if (mediaRef != null && mediaRef.Kind == JsonKind.String && mediaRef.String.Length > 0)
                    media = mediaRef.String;
            }
            var absolute = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "..", media));
            UiKit.VideoSlot(absolute, Locale.T("t01.media.missing"), Locale.T("t01.media.found"));
            UiKit.ButtonRow(
                Locale.T("t01.meeting.pay"), Btn.Danger, () => flow.Go(SceneId.Scn_T01_PayDesk),
                Locale.T("t01.meeting.report"), Btn.Pass, () => flow.Go(SceneId.Scn_T01_Report));
            UiKit.Button(Locale.T("back.inbox"), Btn.Soft, () => flow.Go(SceneId.Scn_T01_Inbox));
        }

        static void PayDesk()
        {
            var flow = FlowController.Instance;
            UiKit.Title(Locale.T("t01.pay.title"));
            UiKit.BeginCard();
            UiKit.Body(Locale.T("t01.pay.form"));
            UiKit.EndCard();
            ChoiceButton(RoomPaths.T01ConfirmPay, Btn.Danger);
            UiKit.Button(Locale.T("back.meeting"), Btn.Soft, () => flow.Go(SceneId.Scn_T01_Meeting));
        }

        static void Report()
        {
            UiKit.Title(Locale.T("t01.report.title"));
            UiKit.Body(Locale.T("t01.report.body"));
            ChoiceButton(RoomPaths.T01HoldReport, Btn.Pass);
            UiKit.Button(Locale.T("back.meeting"), Btn.Soft, () => FlowController.Instance.Go(SceneId.Scn_T01_Meeting));
        }

        static void Pass()
        {
            UiKit.Title(Locale.T("t01.pass.title"));
            UiKit.Body(Locale.T("t01.pass.body"));
            TwinCard();
            UiKit.Button(Locale.T("next"), Btn.Slate, () => FlowController.Instance.Go(SceneId.Scn_T01_Teach));
        }

        static void Teach()
        {
            var flow = FlowController.Instance;
            UiKit.Title(Locale.T("t01.teach.title"));
            UiKit.Body(Locale.T("t01.teach.body"));
            Quote(flow.Session != null ? flow.Session.TerminalNodeId : "n_outcome_blocked");
            TwinCard();
            UiKit.Note(Locale.T("written"));
            UiKit.ButtonRow(
                Locale.T("back.hub"), Btn.Soft, () => flow.Go(SceneId.Scn_TopicsHub),
                Locale.T("open.dashboard"), Btn.Slate, () => flow.Go(SceneId.Scn_Dashboard));
        }

        static void Statement()
        {
            var flow = FlowController.Instance;
            UiKit.Title(Locale.T("t02.statement.title"));
            UiKit.Body(Locale.T("t02.statement.note"));
            if (flow.Session != null && flow.Session.Script != null)
                UiKit.Note(CustomerLine(flow.Session.Script));
            Quote("n_link");
            Quote("n_story");
            UiKit.Button(Locale.T("next"), Btn.Slate, () => flow.Go(SceneId.Scn_T02_Chain));
            UiKit.Button(Locale.T("back.hub"), Btn.Soft, () => flow.Go(SceneId.Scn_TopicsHub));
        }

        static void Chain()
        {
            var flow = FlowController.Instance;
            UiKit.Title(Locale.T("t02.chain.title"));
            UiKit.Body(Locale.T("t02.chain.note"));
            UiKit.BeginCard();
            UiKit.Body(Locale.T("t02.chain.hops"));
            UiKit.EndCard();
            Quote("n_proceeds");
            var script = flow.Session != null ? flow.Session.Script : null;
            var node = script != null ? CaseLibrary.FindNode(script, "n_proceeds") : null;
            var tx = Transactions(node);
            if (tx.Length > 0)
            {
                UiKit.BeginCard();
                UiKit.Heading(Locale.T("script.tx"));
                UiKit.Body(tx);
                UiKit.EndCard();
            }
            UiKit.Button(Locale.T("next"), Btn.Slate, () => flow.Go(SceneId.Scn_T02_Decision));
            UiKit.Button(Locale.T("back.statement"), Btn.Soft, () => flow.Go(SceneId.Scn_T02_Statement));
        }

        static void Decision()
        {
            UiKit.Title(Locale.T("t02.decision.title"));
            UiKit.Body(Locale.T("t02.decision.lead"));
            UiKit.BeginCard();
            UiKit.Body(Locale.T("t02.str.gloss"));
            UiKit.EndCard();
            ChoiceButton(RoomPaths.T02A, Btn.Danger);
            ChoiceButton(RoomPaths.T02B, Btn.Pass);
            ChoiceButton(RoomPaths.T02C, Btn.Pass);
            ChoiceButton(RoomPaths.T02D, Btn.Pass);
            UiKit.Button(Locale.T("back.hub"), Btn.Soft, () => FlowController.Instance.Go(SceneId.Scn_TopicsHub));
        }

        static void Outcome(string titleKey, string bodyKey, bool teachNext)
        {
            var flow = FlowController.Instance;
            UiKit.Title(Locale.T(titleKey));
            UiKit.Body(Locale.T(bodyKey));
            Quote(flow.Session != null ? flow.Session.TerminalNodeId : "");
            TwinCard();
            UiKit.Note(Locale.T("written"));
            if (teachNext)
                UiKit.Button(Locale.T("next"), Btn.Slate, () => flow.Go(SceneId.Scn_T01_Teach));
            UiKit.ButtonRow(
                Locale.T("back.hub"), Btn.Soft, () => flow.Go(SceneId.Scn_TopicsHub),
                Locale.T("open.dashboard"), Btn.Slate, () => flow.Go(SceneId.Scn_Dashboard));
        }

        static void Settings()
        {
            var flow = FlowController.Instance;
            UiKit.Title(Locale.T("settings.title"));
            UiKit.Body(Locale.T("settings.body"));
            UiKit.Button(Locale.T("settings.en"), Btn.Soft, () => flow.SetLocale(LocaleCode.En));
            UiKit.Button(Locale.T("settings.zh"), Btn.Soft, () => flow.SetLocale(LocaleCode.Zh));
            UiKit.Button(Locale.T("back.hub"), Btn.Soft, () => flow.Go(SceneId.Scn_TopicsHub));
        }

        static void ChoiceButton(RoomChoice choice, Btn kind)
        {
            UiKit.Button(Locale.T(choice.LabelKey) + "\n" + Locale.T(choice.DetailKey), kind,
                () => FlowController.Instance.Commit(choice.ChoiceId));
        }

        static void Quote(string nodeId)
        {
            if (string.IsNullOrEmpty(nodeId)) return;
            var flow = FlowController.Instance;
            var script = flow.Session != null ? flow.Session.Script : null;
            var node = script != null ? CaseLibrary.FindNode(script, nodeId) : null;
            if (node == null) return;
            UiKit.BeginCard();
            UiKit.Note(Locale.T("script.heading") + "  ·  " + nodeId);
            var title = node.Get("title");
            if (title != null && title.Kind == JsonKind.String) UiKit.Heading(title.String);
            var prompt = node.Get("prompt");
            if (prompt != null && prompt.Kind == JsonKind.String) UiKit.Body(prompt.String);
            UiKit.EndCard();
        }

        static void TwinCard()
        {
            var session = FlowController.Instance.Session;
            if (session == null) return;
            SessionCard(session);
        }

        static void SessionCard(TwinSession session)
        {
            UiKit.BeginCard();
            UiKit.Heading(session.Topic + "  ·  " + session.CaseId);
            UiKit.Body(Locale.T("field.disposition") + ": " + Show(session.Disposition));
            UiKit.Body(Locale.T("field.phase") + ": " + Show(session.Phase));
            UiKit.Body(Locale.T("field.kyc") + ": " + Show(session.KycStatus));
            UiKit.Body(Locale.T("field.score") + ": " + session.RiskScore);
            UiKit.Body(Locale.T("field.flags") + ": " + (session.Flags.Count == 0 ? Locale.T("none") : string.Join(", ", session.Flags.ToArray())));
            UiKit.Body(Locale.T("field.funds") + ": " + YesNo(session.FundsRisk));
            UiKit.Body(Locale.T("field.callback") + ": " + YesNo(session.CalledBack));
            UiKit.Body(Locale.T("field.dual") + ": " + YesNo(session.DualApproval));
            UiKit.Body(Locale.T("field.str") + ": " + YesNo(session.StrFiled));
            var last = session.LastChoice;
            if (last != null)
            {
                UiKit.Body(Locale.T("field.choice") + ": " + last.ChoiceId + "  (" + string.Join(" → ", last.ScriptChoiceIds.ToArray()) + ")");
                UiKit.Body(Locale.T("field.reaction") + ": " + last.ReactionMs + " ms");
            }
            if (!string.IsNullOrEmpty(session.MappingNote)) UiKit.Note(session.MappingNote);
            UiKit.EndCard();
        }

        static string CustomerLine(JsonValue script)
        {
            var twin = script.Get("initial_twin_state");
            if (twin == null) return "";
            var customer = twin.Get("customer");
            var account = twin.Get("account");
            var name = customer != null && customer.Get("display_name") != null ? customer.Get("display_name").String : "";
            var id = customer != null && customer.Get("id") != null ? customer.Get("id").String : "";
            var accountId = account != null && account.Get("id") != null && account.Get("id").Kind == JsonKind.String
                ? account.Get("id").String
                : "";
            return name + "  " + id + (accountId.Length > 0 ? "  " + accountId : "");
        }

        static string RulesText(JsonValue script)
        {
            var rules = script.Get("rules");
            if (rules == null || rules.Kind != JsonKind.Array) return "";
            var builder = new StringBuilder();
            for (var i = 0; i < rules.Array.Count; i++)
            {
                var rule = rules.Array[i];
                if (i > 0) builder.Append("\n\n");
                builder.Append(rule.Get("id") != null ? rule.Get("id").String : "");
                builder.Append("\n");
                builder.Append(rule.Get("when") != null ? rule.Get("when").String : "");
                var then = rule.Get("then");
                if (then != null && then.Kind == JsonKind.String)
                {
                    builder.Append("\n");
                    builder.Append(then.String);
                }
                var flags = rule.Get("flags");
                if (flags != null && flags.Kind == JsonKind.Array && flags.Array.Count > 0)
                {
                    builder.Append("\n");
                    for (var f = 0; f < flags.Array.Count; f++)
                    {
                        if (f > 0) builder.Append(", ");
                        if (flags.Array[f].Kind == JsonKind.String) builder.Append(flags.Array[f].String);
                    }
                }
            }
            return builder.ToString();
        }

        static string Transactions(JsonValue node)
        {
            if (node == null) return "";
            var patch = node.Get("twin_patch");
            if (patch == null) return "";
            var rows = patch.Get("transactions");
            if (rows == null || rows.Kind != JsonKind.Array) return "";
            var builder = new StringBuilder();
            for (var i = 0; i < rows.Array.Count; i++)
            {
                var row = rows.Array[i];
                if (i > 0) builder.Append('\n');
                var id = row.Get("id");
                var kind = row.Get("kind");
                var amount = row.Get("amount_hkd");
                builder.Append(id != null ? id.String : "");
                builder.Append("  ");
                builder.Append(kind != null ? kind.String : "");
                builder.Append("  HKD ");
                builder.Append(amount != null && amount.Kind == JsonKind.Number ? amount.Number.ToString("0") : "");
            }
            return builder.ToString();
        }

        static string Show(string value)
        {
            return string.IsNullOrEmpty(value) ? Locale.T("none") : value;
        }

        static string YesNo(bool value)
        {
            return Locale.T(value ? "yes" : "no");
        }

        static bool IsExercise(SceneId id)
        {
            var name = id.ToString();
            return name.IndexOf("_T01_", System.StringComparison.Ordinal) >= 0
                || name.IndexOf("_T02_", System.StringComparison.Ordinal) >= 0
                || name.IndexOf("_T03_", System.StringComparison.Ordinal) >= 0
                || name.IndexOf("_T04_", System.StringComparison.Ordinal) >= 0;
        }
    }
}
