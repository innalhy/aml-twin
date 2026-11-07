namespace TwinAml
{
    public enum SceneId
    {
        Scn_Boot,
        Scn_Login,
        Scn_Intro,
        Scn_TopicsHub,
        Scn_Dashboard,
        Scn_Settings,
        Scn_T01_Brief,
        Scn_T01_Inbox,
        Scn_T01_Meeting,
        Scn_T01_PayDesk,
        Scn_T01_Report,
        Scn_T01_Trap,
        Scn_T01_Pass,
        Scn_T01_Teach,
        Scn_T02_Brief,
        Scn_T02_Statement,
        Scn_T02_Chain,
        Scn_T02_Decision,
        Scn_T02_FeedbackA,
        Scn_T02_FeedbackPass,
        Scn_T03_Brief,
        Scn_T03_Branch,
        Scn_T03_Feedback,
        Scn_T04_Brief,
        Scn_T04_Room,
        Scn_T04_Report
    }

    public static class SceneCatalog
    {
        public static readonly SceneId[] BuildOrder = new[]
        {
            SceneId.Scn_Boot,
            SceneId.Scn_Login,
            SceneId.Scn_Intro,
            SceneId.Scn_TopicsHub,
            SceneId.Scn_Dashboard,
            SceneId.Scn_Settings,
            SceneId.Scn_T01_Brief,
            SceneId.Scn_T01_Inbox,
            SceneId.Scn_T01_Meeting,
            SceneId.Scn_T01_PayDesk,
            SceneId.Scn_T01_Report,
            SceneId.Scn_T01_Trap,
            SceneId.Scn_T01_Pass,
            SceneId.Scn_T01_Teach,
            SceneId.Scn_T02_Brief,
            SceneId.Scn_T02_Statement,
            SceneId.Scn_T02_Chain,
            SceneId.Scn_T02_Decision,
            SceneId.Scn_T02_FeedbackA,
            SceneId.Scn_T02_FeedbackPass,
            SceneId.Scn_T03_Brief,
            SceneId.Scn_T03_Branch,
            SceneId.Scn_T03_Feedback,
            SceneId.Scn_T04_Brief,
            SceneId.Scn_T04_Room,
            SceneId.Scn_T04_Report
        };

        public static bool TryParse(string sceneName, out SceneId id)
        {
            for (var i = 0; i < BuildOrder.Length; i++)
            {
                if (BuildOrder[i].ToString() == sceneName)
                {
                    id = BuildOrder[i];
                    return true;
                }
            }
            id = SceneId.Scn_Boot;
            return false;
        }

        public static string TopicOf(SceneId id)
        {
            var name = id.ToString();
            if (name.IndexOf("_T01_", System.StringComparison.Ordinal) >= 0) return "T01";
            if (name.IndexOf("_T02_", System.StringComparison.Ordinal) >= 0) return "T02";
            if (name.IndexOf("_T03_", System.StringComparison.Ordinal) >= 0) return "T03";
            if (name.IndexOf("_T04_", System.StringComparison.Ordinal) >= 0) return "T04";
            return "";
        }
    }
}
