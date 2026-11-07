using System.Collections.Generic;

namespace TwinAml
{
    /// <summary>
    /// Immersive choices and the frozen script choice ids they play.
    /// Keep this table aligned with scripts/unity-room-paths.test.mjs.
    /// </summary>
    public sealed class RoomChoice
    {
        public string ChoiceId;
        public string LabelKey;
        public string DetailKey;
        public List<string> ScriptChoices = new List<string>();
        public bool Trap;
        public bool CalledBack;
        public bool DualApproval;
        public SceneId Next;
    }

    public static class RoomPaths
    {
        public static readonly RoomChoice T01ConfirmPay = Make(
            "confirm_pay",
            "t01.choice.pay",
            "t01.choice.pay.detail",
            new[] { "pass_video", "clear_alert" },
            true,
            false,
            false,
            SceneId.Scn_T01_Trap);

        public static readonly RoomChoice T01HoldReport = Make(
            "hold_and_report",
            "t01.choice.report",
            "t01.choice.report.detail",
            new[] { "redo_liveness", "follow_r1" },
            false,
            true,
            true,
            SceneId.Scn_T01_Pass);

        public static readonly RoomChoice T02A = Make(
            "A_clear",
            "t02.choice.a",
            "t02.choice.a.detail",
            new[] { "release_friend", "clear_friend" },
            true,
            false,
            false,
            SceneId.Scn_T02_FeedbackA);

        public static readonly RoomChoice T02B = Make(
            "B_edd",
            "t02.choice.b",
            "t02.choice.b.detail",
            new[] { "edd_cluster", "hold", "exit_rel" },
            false,
            false,
            true,
            SceneId.Scn_T02_FeedbackPass);

        public static readonly RoomChoice T02C = Make(
            "C_hold",
            "t02.choice.c",
            "t02.choice.c.detail",
            new[] { "restrict", "hold", "exit_rel" },
            false,
            false,
            true,
            SceneId.Scn_T02_FeedbackPass);

        public static readonly RoomChoice T03Open = Make(
            "open_account",
            "t03.choice.open",
            "t03.choice.open.detail",
            new[] { "open_now" },
            true,
            false,
            false,
            SceneId.Scn_T03_Feedback);

        public static readonly RoomChoice T03Docs = Make(
            "request_documents",
            "t03.choice.docs",
            "t03.choice.docs.detail",
            new[] { "request_docs" },
            true,
            false,
            false,
            SceneId.Scn_T03_Feedback);

        public static readonly RoomChoice T03Edd = Make(
            "order_edd",
            "t03.choice.edd",
            "t03.choice.edd.detail",
            new[] { "order_edd" },
            false,
            false,
            true,
            SceneId.Scn_T03_Feedback);

        public static readonly RoomChoice T03Report = Make(
            "report_compliance",
            "t03.choice.report",
            "t03.choice.report.detail",
            new[] { "report_hold" },
            false,
            false,
            true,
            SceneId.Scn_T03_Feedback);

        public static readonly RoomChoice T03Refuse = Make(
            "refuse_onboarding",
            "t03.choice.refuse",
            "t03.choice.refuse.detail",
            new[] { "refuse_relationship" },
            false,
            false,
            false,
            SceneId.Scn_T03_Feedback);

        public static readonly RoomChoice T02D = Make(
            "D_str",
            "t02.choice.d",
            "t02.choice.d.detail",
            new[] { "edd_cluster", "hold", "str_freeze" },
            false,
            false,
            true,
            SceneId.Scn_T02_FeedbackPass);

        public static RoomChoice Find(string choiceId)
        {
            var all = new[] { T01ConfirmPay, T01HoldReport, T02A, T02B, T02C, T02D, T03Open, T03Docs, T03Edd, T03Report, T03Refuse };
            for (var i = 0; i < all.Length; i++)
            {
                if (all[i].ChoiceId == choiceId) return all[i];
            }
            return null;
        }

        static RoomChoice Make(string id, string label, string detail, string[] script, bool trap, bool calledBack, bool dual, SceneId next)
        {
            var choice = new RoomChoice();
            choice.ChoiceId = id;
            choice.LabelKey = label;
            choice.DetailKey = detail;
            choice.Trap = trap;
            choice.CalledBack = calledBack;
            choice.DualApproval = dual;
            choice.Next = next;
            for (var i = 0; i < script.Length; i++) choice.ScriptChoices.Add(script[i]);
            return choice;
        }
    }
}
