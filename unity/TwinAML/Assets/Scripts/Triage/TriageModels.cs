using System;
using System.Collections.Generic;

namespace TwinAml
{
    public sealed class TriageFlag
    {
        public string Id = "";
        public string Title = "";
        public string Why = "";
        public string Evidence = "";
    }

    public sealed class TriageTx
    {
        public string When = "";
        public string What = "";
        public string Amount = "";
        public string Detail = "";
    }

    public sealed class BoardNode
    {
        public string Id = "";
        public string Label = "";
        public string Kind = "";
        public float X;
        public float Y;
        public bool Hot;
    }

    public sealed class BoardEdge
    {
        public string From = "";
        public string To = "";
        public string Label = "";
    }

    /// <summary>
    /// One alert from the Topic 4 dossier file. The room reads that file.
    /// Choice ids stay on the schema 0.1 script.
    /// </summary>
    public sealed class TriageAlert
    {
        public string Id = "";
        public string Title = "";
        public string CustomerName = "";
        public string CustomerId = "";
        public string CustomerType = "";
        public string Occupation = "";
        public string AmountLabel = "";
        public double AmountHkd;
        public string Priority = "";
        public int PriorityRank = 9;
        public string Deadline = "";
        public int DeadlineRank = 9;
        public string RiskTag = "";
        public string Region = "";
        public string Trigger = "";
        public string Guide = "";
        public string SampleNote = "";
        public List<string> Kyc = new List<string>();
        public List<string> GeographyNotes = new List<string>();
        public List<string> Screening = new List<string>();
        public List<string> News = new List<string>();
        public List<string> ReviewSteps = new List<string>();
        public List<TriageTx> Transactions = new List<TriageTx>();
        public List<TriageFlag> RedFlags = new List<TriageFlag>();
        public List<BoardNode> MapPlaces = new List<BoardNode>();
        public List<BoardEdge> MapFlows = new List<BoardEdge>();
        public List<BoardNode> LinkNodes = new List<BoardNode>();
        public List<BoardEdge> LinkEdges = new List<BoardEdge>();
        public List<string> Correct = new List<string>();
        public List<string> Acceptable = new List<string>();
        public Dictionary<string, string> Why = new Dictionary<string, string>();
        public Dictionary<string, string> ScriptChoice = new Dictionary<string, string>();

        public string Grade(string decisionKey)
        {
            if (Contains(Correct, decisionKey)) return "correct";
            if (Contains(Acceptable, decisionKey)) return "acceptable";
            return "miss";
        }

        static bool Contains(List<string> list, string key)
        {
            for (var i = 0; i < list.Count; i++)
            {
                if (list[i] == key) return true;
            }
            return false;
        }
    }

    public static class TriageLibrary
    {
        public static readonly string[] DecisionKeys = { "close", "more", "escalate", "report" };

        public static List<TriageAlert> Read(JsonValue pack)
        {
            if (pack == null) throw new EffectException("Alert dossier is missing.");
            var alerts = pack.Get("alerts");
            if (alerts == null || alerts.Kind != JsonKind.Array)
                throw new EffectException("alerts is missing from the dossier file.");
            var list = new List<TriageAlert>();
            for (var i = 0; i < alerts.Array.Count; i++)
                list.Add(ReadAlert(alerts.Array[i], i));
            if (list.Count != 6)
                throw new EffectException("Topic 4 needs 6 alerts. Found " + list.Count + ".");
            return list;
        }

        static TriageAlert ReadAlert(JsonValue obj, int index)
        {
            if (obj == null || obj.Kind != JsonKind.Object)
                throw new EffectException("Alert " + index + " is not an object.");
            var alert = new TriageAlert();
            alert.Id = Req(obj, "id");
            alert.Title = Req(obj, "title");
            alert.CustomerName = Req(obj, "customer_name");
            alert.CustomerId = Req(obj, "customer_id");
            alert.CustomerType = Req(obj, "customer_type");
            alert.Occupation = Req(obj, "occupation");
            alert.AmountLabel = Req(obj, "amount_label");
            alert.AmountHkd = Num(obj, "amount_hkd");
            alert.Priority = Req(obj, "priority");
            alert.PriorityRank = (int)Num(obj, "priority_rank");
            alert.Deadline = Req(obj, "deadline");
            alert.DeadlineRank = (int)Num(obj, "deadline_rank");
            alert.RiskTag = Req(obj, "risk_tag");
            alert.Region = Req(obj, "region");
            alert.Trigger = Req(obj, "trigger");
            alert.Guide = Req(obj, "guide");
            alert.SampleNote = Req(obj, "sample_note");
            alert.Kyc = Strings(obj, "kyc");
            alert.GeographyNotes = Strings(obj, "geography_notes");
            alert.Screening = Strings(obj, "screening");
            alert.News = Strings(obj, "news");
            alert.ReviewSteps = Strings(obj, "review_steps");
            alert.Transactions = Txs(obj);
            alert.RedFlags = Flags(obj, alert.Id);
            alert.MapPlaces = Nodes(obj, "map_places");
            alert.MapFlows = Edges(obj, "map_flows");
            alert.LinkNodes = Nodes(obj, "link_nodes");
            alert.LinkEdges = Edges(obj, "link_edges");
            alert.Correct = Keys(obj, "correct", alert.Id);
            alert.Acceptable = Keys(obj, "acceptable", alert.Id);
            for (var i = 0; i < alert.Correct.Count; i++)
            {
                if (alert.Acceptable.Contains(alert.Correct[i]))
                    throw new EffectException(alert.Id + " lists " + alert.Correct[i] + " as both correct and acceptable.");
            }
            alert.Why = Four(obj, "why", alert.Id);
            alert.ScriptChoice = Four(obj, "script_choice", alert.Id);
            if (alert.RedFlags.Count < 3)
                throw new EffectException(alert.Id + " needs at least 3 red flags.");
            return alert;
        }

        static Dictionary<string, string> Four(JsonValue obj, string key, string alertId)
        {
            var value = obj.Get(key);
            if (value == null || value.Kind != JsonKind.Object)
                throw new EffectException(alertId + " is missing " + key + ".");
            var map = new Dictionary<string, string>();
            for (var i = 0; i < DecisionKeys.Length; i++)
            {
                var item = value.Get(DecisionKeys[i]);
                if (item == null || item.Kind != JsonKind.String || item.String.Length == 0)
                    throw new EffectException(alertId + " " + key + "." + DecisionKeys[i] + " is missing.");
                map[DecisionKeys[i]] = item.String;
            }
            return map;
        }

        static List<string> Keys(JsonValue obj, string key, string alertId)
        {
            var list = Strings(obj, key);
            for (var i = 0; i < list.Count; i++)
            {
                if (!IsDecision(list[i]))
                    throw new EffectException(alertId + " " + key + " has unknown path " + list[i] + ".");
            }
            return list;
        }

        public static bool IsDecision(string key)
        {
            for (var i = 0; i < DecisionKeys.Length; i++)
            {
                if (DecisionKeys[i] == key) return true;
            }
            return false;
        }

        public static string DecisionLabel(string key)
        {
            if (key == "close") return "Close";
            if (key == "more") return "Ask for more information";
            if (key == "escalate") return "Escalate the investigation";
            if (key == "report") return "Draft an STR";
            return key ?? "";
        }

        static List<TriageFlag> Flags(JsonValue obj, string alertId)
        {
            var raw = obj.Get("red_flags");
            if (raw == null || raw.Kind != JsonKind.Array)
                throw new EffectException(alertId + " red_flags is missing.");
            var list = new List<TriageFlag>();
            for (var i = 0; i < raw.Array.Count; i++)
            {
                var item = raw.Array[i];
                var flag = new TriageFlag();
                flag.Id = Req(item, "id");
                flag.Title = Req(item, "title");
                flag.Why = Req(item, "why");
                flag.Evidence = Req(item, "evidence");
                list.Add(flag);
            }
            return list;
        }

        static List<TriageTx> Txs(JsonValue obj)
        {
            var list = new List<TriageTx>();
            var raw = obj.Get("transactions");
            if (raw == null || raw.Kind != JsonKind.Array) return list;
            for (var i = 0; i < raw.Array.Count; i++)
            {
                var item = raw.Array[i];
                var tx = new TriageTx();
                tx.When = Req(item, "when");
                tx.What = Req(item, "what");
                tx.Amount = Req(item, "amount");
                tx.Detail = Req(item, "detail");
                list.Add(tx);
            }
            return list;
        }

        static List<BoardNode> Nodes(JsonValue obj, string key)
        {
            var list = new List<BoardNode>();
            var raw = obj.Get(key);
            if (raw == null || raw.Kind != JsonKind.Array) return list;
            for (var i = 0; i < raw.Array.Count; i++)
            {
                var item = raw.Array[i];
                var node = new BoardNode();
                node.Id = Req(item, "id");
                node.Label = Req(item, "label");
                node.Kind = item.Get("kind") != null && item.Get("kind").Kind == JsonKind.String
                    ? item.Get("kind").String
                    : "account";
                node.X = (float)Num(item, "x");
                node.Y = (float)Num(item, "y");
                var hot = item.Get("hot");
                node.Hot = hot != null && hot.Kind == JsonKind.Bool && hot.Bool;
                list.Add(node);
            }
            return list;
        }

        static List<BoardEdge> Edges(JsonValue obj, string key)
        {
            var list = new List<BoardEdge>();
            var raw = obj.Get(key);
            if (raw == null || raw.Kind != JsonKind.Array) return list;
            for (var i = 0; i < raw.Array.Count; i++)
            {
                var item = raw.Array[i];
                var edge = new BoardEdge();
                edge.From = Req(item, "from");
                edge.To = Req(item, "to");
                edge.Label = item.Get("label") != null && item.Get("label").Kind == JsonKind.String
                    ? item.Get("label").String
                    : "";
                list.Add(edge);
            }
            return list;
        }

        static List<string> Strings(JsonValue obj, string key)
        {
            var list = new List<string>();
            var raw = obj.Get(key);
            if (raw == null) return list;
            if (raw.Kind != JsonKind.Array) throw new EffectException(key + " is not an array.");
            for (var i = 0; i < raw.Array.Count; i++)
            {
                if (raw.Array[i].Kind != JsonKind.String)
                    throw new EffectException(key + " must be strings.");
                list.Add(raw.Array[i].String);
            }
            return list;
        }

        static string Req(JsonValue obj, string key)
        {
            var value = obj != null ? obj.Get(key) : null;
            if (value == null || value.Kind != JsonKind.String || value.String.Length == 0)
                throw new EffectException("Missing text \"" + key + "\".");
            return value.String;
        }

        static double Num(JsonValue obj, string key)
        {
            var value = obj != null ? obj.Get(key) : null;
            if (value == null || value.Kind != JsonKind.Number)
                throw new EffectException("Missing number \"" + key + "\".");
            return value.Number;
        }
    }
}
