using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEngine;

namespace TwinAml
{
    public sealed class ChoiceRecord
    {
        public string ChoiceId;
        public string SceneId;
        public string CaseId;
        public long ShownUnixMs;
        public long ChosenUnixMs;
        public int ReactionMs;
        public List<string> ScriptChoiceIds = new List<string>();
        public bool Trap;
    }

    /// <summary>
    /// One exercise. The mirror is a clone of initial_twin_state plus schema 0.1 patches.
    /// funds_risk, called_back, dual_approval, and str_filed are dashboard fields
    /// written from that mirror and from the room choice. They are not a second case world.
    /// </summary>
    public sealed class TwinSession
    {
        public string Trainee = "";
        public string Topic = "";
        public string CaseId = "";
        public string CaseTitle = "";
        public JsonValue Script;
        public JsonValue Twin;
        public string Phase = "";
        public string Disposition = "";
        public string KycStatus = "";
        public int RiskScore;
        public List<string> Flags = new List<string>();
        public bool FundsRisk;
        public bool CalledBack;
        public bool DualApproval;
        public bool StrFiled;
        public bool Trap;
        public bool Completed;
        public string TerminalNodeId = "";
        public string MappingNote = "";
        public int LearningScore;
        public int ElapsedMs;
        public List<ChoiceRecord> Choices = new List<ChoiceRecord>();

        public ChoiceRecord LastChoice
        {
            get { return Choices.Count == 0 ? null : Choices[Choices.Count - 1]; }
        }
    }

    public static class TwinProjector
    {
        public static void Apply(TwinSession session, RoomChoice choice)
        {
            var twin = session.Twin;
            session.Phase = StringField(twin, "phase");
            session.Disposition = StringField(twin, "disposition");
            var risk = twin != null ? twin.Get("risk") : null;
            session.RiskScore = 0;
            session.Flags = new List<string>();
            if (risk != null)
            {
                var score = risk.Get("score");
                if (score != null && score.Kind == JsonKind.Number)
                    session.RiskScore = (int)Math.Round(score.Number);
                var flags = risk.Get("flags");
                if (flags != null && flags.Kind == JsonKind.Array)
                {
                    for (var i = 0; i < flags.Array.Count; i++)
                    {
                        if (flags.Array[i].Kind == JsonKind.String)
                            session.Flags.Add(flags.Array[i].String);
                    }
                }
            }
            var kyc = twin != null ? twin.Get("kyc") : null;
            session.KycStatus = kyc != null ? StringField(kyc, "status") : "";

            var poor = new HashSet<string>();
            var teaching = session.Script != null ? session.Script.Get("teaching") : null;
            var poorList = teaching != null ? teaching.Get("poor_dispositions") : null;
            if (poorList != null && poorList.Kind == JsonKind.Array)
            {
                for (var i = 0; i < poorList.Array.Count; i++)
                {
                    if (poorList.Array[i].Kind == JsonKind.String) poor.Add(poorList.Array[i].String);
                }
            }
            session.Trap = poor.Contains(session.Disposition);
            session.FundsRisk = session.Trap || Contains(session.Flags, "R2_IGNORED");
            session.StrFiled = Contains(session.Flags, "STR_DRAFTED")
                || session.Disposition == "str_drafted"
                || session.Disposition == "freeze_recommended"
                || session.Disposition == "cdd_refreshed_and_str";
            session.CalledBack = choice != null && choice.CalledBack;
            session.DualApproval = (choice != null && choice.DualApproval) || HasOutboundHold(twin);
            if (choice != null && choice.Trap != session.Trap)
            {
                session.MappingNote = "Room grade and teaching.poor_dispositions disagree for " + session.Disposition + ".";
            }
            else
            {
                session.MappingNote = "";
            }
        }

        public static bool HasOutboundHold(JsonValue twin)
        {
            if (twin == null) return false;
            var account = twin.Get("account");
            if (account == null) return false;
            var holds = account.Get("holds");
            if (holds == null || holds.Kind != JsonKind.Array) return false;
            for (var i = 0; i < holds.Array.Count; i++)
            {
                if (holds.Array[i].Kind == JsonKind.String && holds.Array[i].String == "outbound")
                    return true;
            }
            return false;
        }

        static bool Contains(List<string> flags, string flag)
        {
            for (var i = 0; i < flags.Count; i++)
            {
                if (flags[i] == flag) return true;
            }
            return false;
        }

        static string StringField(JsonValue obj, string key)
        {
            if (obj == null) return "";
            var value = obj.Get(key);
            if (value == null || value.Kind != JsonKind.String) return "";
            return value.String;
        }
    }

    public static class DashboardStore
    {
        public static string FilePath
        {
            get { return Path.Combine(Application.persistentDataPath, "twinaml-dashboard.json"); }
        }

        public static void Write(string trainee, IList<TwinSession> completed)
        {
            var root = new JsonValue { Kind = JsonKind.Object, Object = new List<JsonMember>() };
            root.Object.Add(new JsonMember("synthetic", new JsonValue { Kind = JsonKind.Bool, Bool = true }));
            root.Object.Add(new JsonMember("note", new JsonValue
            {
                Kind = JsonKind.String,
                String = "TwinAML training snapshot. Not a bank connection."
            }));
            root.Object.Add(new JsonMember("trainee", new JsonValue { Kind = JsonKind.String, String = trainee ?? "" }));
            var sessions = new JsonValue { Kind = JsonKind.Array, Array = new List<JsonValue>() };
            for (var i = 0; i < completed.Count; i++) sessions.Array.Add(SessionJson(completed[i]));
            root.Object.Add(new JsonMember("sessions", sessions));
            var dir = Path.GetDirectoryName(FilePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir)) Directory.CreateDirectory(dir);
            File.WriteAllText(FilePath, root.ToJson(), new UTF8Encoding(false));
        }

        public static List<TwinSession> Read()
        {
            var list = new List<TwinSession>();
            if (!File.Exists(FilePath)) return list;
            try
            {
                var parsed = JsonParse.Parse(File.ReadAllText(FilePath, new UTF8Encoding(false)));
                var sessions = parsed.Get("sessions");
                if (sessions == null || sessions.Kind != JsonKind.Array) return list;
                for (var i = 0; i < sessions.Array.Count; i++) list.Add(FromJson(sessions.Array[i]));
            }
            catch (Exception err)
            {
                Debug.LogWarning("TwinAML dashboard file was not read: " + err.Message);
            }
            return list;
        }

        static JsonValue SessionJson(TwinSession session)
        {
            var obj = new JsonValue { Kind = JsonKind.Object, Object = new List<JsonMember>() };
            AddString(obj, "trainee", session.Trainee);
            AddString(obj, "topic", session.Topic);
            AddString(obj, "case_id", session.CaseId);
            AddString(obj, "disposition", session.Disposition);
            AddString(obj, "phase", session.Phase);
            AddString(obj, "kyc_status", session.KycStatus);
            AddString(obj, "terminal_node_id", session.TerminalNodeId);
            AddBool(obj, "trap", session.Trap);
            AddBool(obj, "funds_risk", session.FundsRisk);
            AddBool(obj, "called_back", session.CalledBack);
            AddBool(obj, "dual_approval", session.DualApproval);
            AddBool(obj, "str_filed", session.StrFiled);
            AddNumber(obj, "risk_score", session.RiskScore);
            AddNumber(obj, "learning_score", session.LearningScore);
            AddNumber(obj, "elapsed_ms", session.ElapsedMs);
            obj.Object.Add(new JsonMember("flags", StringArray(session.Flags)));
            var choices = new JsonValue { Kind = JsonKind.Array, Array = new List<JsonValue>() };
            for (var i = 0; i < session.Choices.Count; i++)
            {
                var choice = session.Choices[i];
                var row = new JsonValue { Kind = JsonKind.Object, Object = new List<JsonMember>() };
                AddString(row, "choice_id", choice.ChoiceId);
                AddString(row, "scene_id", choice.SceneId);
                AddString(row, "case_id", choice.CaseId);
                AddNumber(row, "shown_unix_ms", choice.ShownUnixMs);
                AddNumber(row, "chosen_unix_ms", choice.ChosenUnixMs);
                AddNumber(row, "reaction_ms", choice.ReactionMs);
                AddBool(row, "trap", choice.Trap);
                row.Object.Add(new JsonMember("script_choice_ids", StringArray(choice.ScriptChoiceIds)));
                choices.Array.Add(row);
            }
            obj.Object.Add(new JsonMember("choices", choices));
            if (session.Twin != null) obj.Object.Add(new JsonMember("mirror", session.Twin.Clone()));
            return obj;
        }

        static TwinSession FromJson(JsonValue obj)
        {
            var session = new TwinSession();
            session.Trainee = ReadString(obj, "trainee");
            session.Topic = ReadString(obj, "topic");
            session.CaseId = ReadString(obj, "case_id");
            session.Disposition = ReadString(obj, "disposition");
            session.Phase = ReadString(obj, "phase");
            session.KycStatus = ReadString(obj, "kyc_status");
            session.TerminalNodeId = ReadString(obj, "terminal_node_id");
            session.Trap = ReadBool(obj, "trap");
            session.FundsRisk = ReadBool(obj, "funds_risk");
            session.CalledBack = ReadBool(obj, "called_back");
            session.DualApproval = ReadBool(obj, "dual_approval");
            session.StrFiled = ReadBool(obj, "str_filed");
            session.RiskScore = (int)ReadNumber(obj, "risk_score");
            session.LearningScore = (int)ReadNumber(obj, "learning_score");
            session.ElapsedMs = (int)ReadNumber(obj, "elapsed_ms");
            session.Completed = true;
            session.Flags = ReadStrings(obj.Get("flags"));
            session.Twin = obj.Get("mirror");
            var choices = obj.Get("choices");
            if (choices != null && choices.Kind == JsonKind.Array)
            {
                for (var i = 0; i < choices.Array.Count; i++)
                {
                    var row = choices.Array[i];
                    var record = new ChoiceRecord();
                    record.ChoiceId = ReadString(row, "choice_id");
                    record.SceneId = ReadString(row, "scene_id");
                    record.CaseId = ReadString(row, "case_id");
                    record.ShownUnixMs = (long)ReadNumber(row, "shown_unix_ms");
                    record.ChosenUnixMs = (long)ReadNumber(row, "chosen_unix_ms");
                    record.ReactionMs = (int)ReadNumber(row, "reaction_ms");
                    record.Trap = ReadBool(row, "trap");
                    record.ScriptChoiceIds = ReadStrings(row.Get("script_choice_ids"));
                    session.Choices.Add(record);
                }
            }
            return session;
        }

        static JsonValue StringArray(List<string> values)
        {
            var array = new JsonValue { Kind = JsonKind.Array, Array = new List<JsonValue>() };
            if (values == null) return array;
            for (var i = 0; i < values.Count; i++)
                array.Array.Add(new JsonValue { Kind = JsonKind.String, String = values[i] ?? "" });
            return array;
        }

        static void AddString(JsonValue obj, string key, string value)
        {
            obj.Object.Add(new JsonMember(key, new JsonValue { Kind = JsonKind.String, String = value ?? "" }));
        }

        static void AddBool(JsonValue obj, string key, bool value)
        {
            obj.Object.Add(new JsonMember(key, new JsonValue { Kind = JsonKind.Bool, Bool = value }));
        }

        static void AddNumber(JsonValue obj, string key, double value)
        {
            obj.Object.Add(new JsonMember(key, new JsonValue { Kind = JsonKind.Number, Number = value }));
        }

        static string ReadString(JsonValue obj, string key)
        {
            var value = obj != null ? obj.Get(key) : null;
            return value != null && value.Kind == JsonKind.String ? value.String : "";
        }

        static bool ReadBool(JsonValue obj, string key)
        {
            var value = obj != null ? obj.Get(key) : null;
            return value != null && value.Kind == JsonKind.Bool && value.Bool;
        }

        static double ReadNumber(JsonValue obj, string key)
        {
            var value = obj != null ? obj.Get(key) : null;
            return value != null && value.Kind == JsonKind.Number ? value.Number : 0;
        }

        static List<string> ReadStrings(JsonValue array)
        {
            var list = new List<string>();
            if (array == null || array.Kind != JsonKind.Array) return list;
            for (var i = 0; i < array.Array.Count; i++)
            {
                if (array.Array[i].Kind == JsonKind.String) list.Add(array.Array[i].String);
            }
            return list;
        }
    }
}
