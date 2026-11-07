using System;
using System.Collections.Generic;
using System.Text;

namespace TwinAml
{
    /// <summary>
    /// What the trainee noticed in the branch. The twin is still the case script.
    /// These sets are room observations, not a second case world.
    /// </summary>
    public static class BranchProgress
    {
        public static long StartedUnixMs;
        public static bool HasPose;
        public static UnityEngine.Vector3 Pose;
        public static float Yaw;
        public static int ClientStop;
        public static int Hints;
        public static string Reason = "";
        public static bool ClockArmed;
        public static bool SawComputer;
        public static bool ReadPolicy;
        public static bool UboMarked;
        public static bool GuideDismissed;

        public static readonly HashSet<string> Asked = new HashSet<string>();
        public static readonly HashSet<string> Reviewed = new HashSet<string>();
        public static readonly HashSet<string> Marked = new HashSet<string>();
        public static readonly HashSet<string> Supplement = new HashSet<string>();
        public static readonly HashSet<string> Opened = new HashSet<string>();
        public static readonly HashSet<string> Wrong = new HashSet<string>();
        public static readonly List<string> Notes = new List<string>();

        public static readonly string[] DocIds =
        {
            "passport", "address", "br", "directors", "members", "plan", "funds", "mandate"
        };

        public static void Reset()
        {
            StartedUnixMs = 0;
            HasPose = false;
            Pose = UnityEngine.Vector3.zero;
            Yaw = 0f;
            ClientStop = 0;
            Hints = 0;
            Reason = "";
            ClockArmed = false;
            SawComputer = false;
            ReadPolicy = false;
            UboMarked = false;
            GuideDismissed = false;
            Asked.Clear();
            Reviewed.Clear();
            Marked.Clear();
            Supplement.Clear();
            Opened.Clear();
            Wrong.Clear();
            Notes.Clear();
        }

        public static string CoachKey()
        {
            if (ClientStop == 0)
                return Asked.Contains("service") && Asked.Contains("volume") ? "coach.invite" : "coach.greet";
            if (Reviewed.Count < DocIds.Length) return "coach.docs";
            if (!Asked.Contains("ubo") || !Asked.Contains("sof") || !Asked.Contains("authority") || !Asked.Contains("volume"))
                return "coach.ask";
            if (!NodeVisible("mr_a") || !UboMarked) return "coach.chart";
            if (!SawComputer) return "coach.computer";
            if (!Marked.Contains("sof")) return "coach.funds";
            return "coach.decide";
        }

        public static void MarkEntered()
        {
            if (StartedUnixMs > 0) return;
            StartedUnixMs = Now();
        }

        public static int ElapsedMs()
        {
            if (StartedUnixMs <= 0) return 0;
            return (int)Math.Max(0, Now() - StartedUnixMs);
        }

        public static string IssueFor(string docId)
        {
            if (docId == "passport" || docId == "address") return "address";
            if (docId == "br") return "young";
            if (docId == "members") return "bvi";
            if (docId == "plan") return "volume";
            if (docId == "funds") return "sof";
            if (docId == "mandate") return "mandate";
            return "";
        }

        public static bool NodeVisible(string id)
        {
            if (id == "starlight") return true;
            if (id == "li" || id == "bvi") return Opened.Contains("starlight");
            if (id == "seychelles") return Opened.Contains("bvi");
            if (id == "mr_a") return Opened.Contains("seychelles");
            return false;
        }

        public static bool RevealNext()
        {
            if (!Opened.Contains("starlight"))
            {
                Opened.Add("starlight");
                Hints++;
                return true;
            }
            if (!Opened.Contains("bvi"))
            {
                Opened.Add("bvi");
                Hints++;
                return true;
            }
            if (!Opened.Contains("seychelles"))
            {
                Opened.Add("seychelles");
                Hints++;
                return true;
            }
            return false;
        }

        public static int Score(string choiceId)
        {
            int docs;
            int owner;
            int funds;
            int business;
            int decision;
            int penalty;
            Parts(choiceId, out docs, out owner, out funds, out business, out decision, out penalty);
            var total = docs + owner + funds + business + decision - penalty;
            if (total < 0) total = 0;
            if (total > 100) total = 100;
            return total;
        }

        public static void Parts(string choiceId, out int docs, out int owner, out int funds, out int business, out int decision, out int penalty)
        {
            docs = 0;
            if (Marked.Contains("address")) docs += 4;
            if (Marked.Contains("young")) docs += 4;
            if (Marked.Contains("bvi")) docs += 4;
            if (Marked.Contains("mandate")) docs += 4;
            if (Marked.Contains("sof")) docs += 4;

            owner = 0;
            if (Asked.Contains("ubo")) owner += 5;
            if (Opened.Contains("seychelles") && NodeVisible("mr_a")) owner += 10;
            if (UboMarked) owner += 10;

            funds = 0;
            if (Asked.Contains("sof")) funds += 10;
            if (Marked.Contains("sof")) funds += 10;

            business = 0;
            if (Asked.Contains("volume")) business += 8;
            if (Marked.Contains("volume") || SawComputer) business += 7;

            decision = DecisionPoints(choiceId);
            penalty = Hints * 3;
            if (Asked.Contains("skip")) penalty += 3;
            if (Wrong.Contains("directors")) penalty += 2;
        }

        public static int DecisionPoints(string choiceId)
        {
            if (choiceId == "order_edd") return 20;
            if (choiceId == "report_compliance") return 18;
            if (choiceId == "refuse_onboarding") return 14;
            if (choiceId == "request_documents") return 8;
            return 0;
        }

        public static string Feedback(string choiceId)
        {
            int docs;
            int owner;
            int funds;
            int business;
            int decision;
            int penalty;
            Parts(choiceId, out docs, out owner, out funds, out business, out decision, out penalty);
            var builder = new StringBuilder();
            builder.Append(BranchCopy.T("fb.score")).Append("  ").Append(Score(choiceId)).Append(" / 100");
            builder.Append("\n").Append(BranchCopy.T("fb.docs")).Append(" ").Append(docs).Append("/20");
            builder.Append("   ").Append(BranchCopy.T("fb.owner")).Append(" ").Append(owner).Append("/25");
            builder.Append("   ").Append(BranchCopy.T("fb.funds")).Append(" ").Append(funds).Append("/20");
            builder.Append("   ").Append(BranchCopy.T("fb.business")).Append(" ").Append(business).Append("/15");
            builder.Append("   ").Append(BranchCopy.T("fb.decision")).Append(" ").Append(decision).Append("/20");
            builder.Append("\n").Append(BranchCopy.T("fb.hints")).Append(" ").Append(Hints);
            builder.Append("   ").Append(BranchCopy.T("fb.time")).Append(" ").Append(Clock(ElapsedMs()));
            if (ReadPolicy) builder.Append("   ").Append(BranchCopy.T("fb.policy"));

            builder.Append("\n\n").Append(BranchCopy.T("fb.your")).Append(": ").Append(ActionLabel(choiceId));
            builder.Append("\n").Append(GradeLine(choiceId));
            if (!string.IsNullOrEmpty(Reason))
                builder.Append("\n").Append(BranchCopy.T("fb.reason")).Append(": ").Append(Reason);

            builder.Append("\n\n").Append(BranchCopy.T("fb.bestTitle"));
            builder.Append("\n").Append(BranchCopy.T("fb.best"));

            builder.Append("\n\n").Append(BranchCopy.T("fb.flags"));
            Flag(builder, Marked.Contains("address"), "issue.address.title", "flag.address");
            Flag(builder, Marked.Contains("young"), "issue.young.title", "flag.young");
            Flag(builder, Marked.Contains("bvi") || Opened.Contains("bvi"), "issue.bvi.title", "flag.bvi");
            Flag(builder, UboMarked, "node.mark", "flag.ubo");
            Flag(builder, Marked.Contains("sof"), "issue.sof.title", "flag.sof");
            Flag(builder, Marked.Contains("volume") || SawComputer, "issue.volume.title", "flag.volume");
            Flag(builder, SawComputer, "spot.computer", "flag.geo");
            Flag(builder, Marked.Contains("mandate"), "issue.mandate.title", "flag.mandate");
            Flag(builder, Asked.Contains("ubo"), "ask.ubo", "flag.evasion");

            builder.Append("\n\n").Append(BranchCopy.T("fb.questions"));
            Lobby(builder, "service");
            Lobby(builder, "company");
            Lobby(builder, "business");
            Question(builder, "sof");
            Question(builder, "ubo");
            Question(builder, "volume");
            Question(builder, "authority");
            Question(builder, "customers");
            Question(builder, "geo");
            if (Asked.Contains("skip"))
                builder.Append("\n").Append(BranchCopy.T("tag.bad")).Append(" · ").Append(BranchCopy.T("ask.skip"));

            builder.Append("\n\n").Append(BranchCopy.T("fb.steps"));
            builder.Append("\n1. ").Append(BranchCopy.T("fb.step1"));
            builder.Append("\n2. ").Append(BranchCopy.T("fb.step2"));
            builder.Append("\n3. ").Append(BranchCopy.T("fb.step3"));
            builder.Append("\n4. ").Append(BranchCopy.T("fb.step4"));
            builder.Append("\n5. ").Append(BranchCopy.T("fb.step5"));
            builder.Append("\n\n").Append(BranchCopy.T("notes.reviewed")).Append(" ").Append(Reviewed.Count).Append(" / ").Append(DocIds.Length);
            return builder.ToString();
        }

        public static string MappingLine(string choiceId)
        {
            var line = "Learning score " + Score(choiceId) + "/100. Branch time " + Clock(ElapsedMs()) + ". Hints " + Hints + ".";
            if (!string.IsNullOrEmpty(Reason))
            {
                var reason = Reason.Replace("\n", " ").Trim();
                if (reason.Length > 80) reason = reason.Substring(0, 80);
                line += " Reason: " + reason;
            }
            return line;
        }

        public static string GapLine()
        {
            var gaps = new List<string>();
            if (!Asked.Contains("service") || !Asked.Contains("volume")) gaps.Add(BranchCopy.T("gap.purpose"));
            if (!Asked.Contains("ubo")) gaps.Add(BranchCopy.T("gap.ubo"));
            if (!Asked.Contains("sof")) gaps.Add(BranchCopy.T("gap.sof"));
            if (!Asked.Contains("volume")) gaps.Add(BranchCopy.T("gap.volume"));
            if (!Asked.Contains("authority")) gaps.Add(BranchCopy.T("gap.authority"));
            if (!NodeVisible("mr_a")) gaps.Add(BranchCopy.T("gap.chart"));
            if (gaps.Count == 0) return "";
            return BranchCopy.T("decide.gap") + string.Join("; ", gaps.ToArray());
        }

        public static string ActionLabel(string choiceId)
        {
            if (choiceId == "open_account") return BranchCopy.T("decide.open");
            if (choiceId == "request_documents") return BranchCopy.T("decide.docs");
            if (choiceId == "order_edd") return BranchCopy.T("decide.edd");
            if (choiceId == "report_compliance") return BranchCopy.T("decide.report");
            if (choiceId == "refuse_onboarding") return BranchCopy.T("decide.refuse");
            return BranchCopy.T("fb.none");
        }

        static string GradeLine(string choiceId)
        {
            if (choiceId == "order_edd") return BranchCopy.T("fb.pass.edd");
            if (choiceId == "report_compliance") return BranchCopy.T("fb.pass.report");
            if (choiceId == "refuse_onboarding") return BranchCopy.T("fb.pass.refuse");
            if (choiceId == "request_documents") return BranchCopy.T("fb.miss.docs");
            if (choiceId == "open_account") return BranchCopy.T("fb.miss.open");
            return BranchCopy.T("fb.none");
        }

        static void Flag(StringBuilder builder, bool found, string titleKey, string bodyKey)
        {
            builder.Append("\n").Append(BranchCopy.T(found ? "fb.found" : "fb.missed"));
            builder.Append(" · ").Append(BranchCopy.T(titleKey));
            builder.Append(" — ").Append(BranchCopy.T(bodyKey));
        }

        static void Lobby(StringBuilder builder, string id)
        {
            builder.Append("\n").Append(BranchCopy.T(Asked.Contains(id) ? "fb.asked" : "fb.notAsked"));
            builder.Append(" · ").Append(BranchCopy.T("greet.q." + id));
        }

        static void Question(StringBuilder builder, string id)
        {
            var asked = Asked.Contains(id);
            builder.Append("\n").Append(BranchCopy.T(asked ? "fb.asked" : "fb.notAsked"));
            builder.Append(" · ").Append(BranchCopy.T("ask." + id));
        }

        static string Clock(int ms)
        {
            var total = Math.Max(0, ms / 1000);
            var minutes = total / 60;
            var seconds = total % 60;
            return minutes + ":" + seconds.ToString("00");
        }

        static long Now()
        {
            return (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
        }
    }
}
