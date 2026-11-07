using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

namespace TwinAml
{
    public static class CaseLibrary
    {
        static readonly Dictionary<string, JsonValue> Cache = new Dictionary<string, JsonValue>();
        static readonly Dictionary<JsonValue, Dictionary<string, JsonValue>> NodeIndex =
            new Dictionary<JsonValue, Dictionary<string, JsonValue>>();
        static Dictionary<string, IndexRow> Index;
        static string CasesDirectory;

        public const string T01CaseId = "deepfake-hk-001";
        public const string T02CaseId = "hk-greythunder-mule-001";
        public const string T03CaseId = "hk-starlight-onboard-001";
        public const string T04CaseId = "alert-triage-shift-001";

        public static JsonValue LoadCase(string caseId)
        {
            if (string.IsNullOrEmpty(caseId)) throw new EffectException("case_id is missing.");
            if (Cache.TryGetValue(caseId, out var cached)) return cached;
            var row = Row(caseId);
            var parsed = ReadChecked(Path.Combine(CasesDirectory, row.File), row.Sha256, row.File);
            var loadedId = parsed.Get("case_id");
            if (loadedId == null || loadedId.Kind != JsonKind.String || loadedId.String != caseId)
                throw new EffectException(row.File + " case_id does not match the index.");
            IndexNodes(parsed);
            Cache[caseId] = parsed;
            return parsed;
        }

        public static JsonValue LoadAlerts(string caseId)
        {
            var row = Row(caseId);
            if (string.IsNullOrEmpty(row.AlertsFile))
                throw new EffectException(caseId + " has no alerts file in data/cases/index.json.");
            var cacheKey = caseId + "#alerts";
            if (Cache.TryGetValue(cacheKey, out var cached)) return cached;
            var parsed = ReadChecked(Path.Combine(CasesDirectory, row.AlertsFile), row.AlertsSha256, row.AlertsFile);
            var loadedId = parsed.Get("case_id");
            if (loadedId == null || loadedId.Kind != JsonKind.String || loadedId.String != caseId)
                throw new EffectException(row.AlertsFile + " case_id does not match the index.");
            Cache[cacheKey] = parsed;
            return parsed;
        }

        public static string ScriptPath(string caseId)
        {
            var row = Row(caseId);
            return Path.Combine(CasesDirectory, row.File);
        }

        public static string AlertsPath(string caseId)
        {
            var row = Row(caseId);
            if (string.IsNullOrEmpty(row.AlertsFile)) return "";
            return Path.Combine(CasesDirectory, row.AlertsFile);
        }

        public static JsonValue FindNode(JsonValue script, string nodeId)
        {
            if (script == null || string.IsNullOrEmpty(nodeId)) return null;
            if (NodeIndex.TryGetValue(script, out var map) && map.TryGetValue(nodeId, out var indexed))
                return indexed;
            var nodes = script.Get("nodes");
            if (nodes == null || nodes.Kind != JsonKind.Array) return null;
            for (var i = 0; i < nodes.Array.Count; i++)
            {
                var id = nodes.Array[i].Get("id");
                if (id != null && id.Kind == JsonKind.String && id.String == nodeId)
                    return nodes.Array[i];
            }
            return null;
        }

        static void IndexNodes(JsonValue script)
        {
            var map = new Dictionary<string, JsonValue>();
            var nodes = script.Get("nodes");
            if (nodes != null && nodes.Kind == JsonKind.Array)
            {
                for (var i = 0; i < nodes.Array.Count; i++)
                {
                    var id = nodes.Array[i].Get("id");
                    if (id != null && id.Kind == JsonKind.String && id.String.Length > 0)
                        map[id.String] = nodes.Array[i];
                }
            }
            NodeIndex[script] = map;
        }

        static IndexRow Row(string caseId)
        {
            EnsureIndex();
            if (!Index.TryGetValue(caseId, out var row))
                throw new EffectException("data/cases/index.json has no case_id " + caseId + ".");
            return row;
        }

        static void EnsureIndex()
        {
            if (Index != null) return;
            string found = null;
            var tried = new List<string>();
            var candidates = new[]
            {
                Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "..", "data", "cases", "index.json")),
                Path.Combine(Application.streamingAssetsPath, "cases", "index.json")
            };
            for (var i = 0; i < candidates.Length; i++)
            {
                tried.Add(candidates[i]);
                if (!File.Exists(candidates[i])) continue;
                found = candidates[i];
                break;
            }
            if (found == null)
                throw new EffectException("Could not read data/cases/index.json. Tried:\n" + string.Join("\n", tried.ToArray()));
            CasesDirectory = Path.GetDirectoryName(found);
            var parsed = JsonParse.Parse(File.ReadAllText(found, new UTF8Encoding(false)));
            var cases = parsed.Get("cases");
            if (cases == null || cases.Kind != JsonKind.Array)
                throw new EffectException("data/cases/index.json has no cases array.");
            var next = new Dictionary<string, IndexRow>();
            for (var i = 0; i < cases.Array.Count; i++)
            {
                var item = cases.Array[i];
                var row = new IndexRow();
                row.CaseId = Required(item, "case_id");
                row.File = Required(item, "file");
                row.Sha256 = Required(item, "sha256");
                var alerts = item.Get("alerts_file");
                if (alerts != null && alerts.Kind == JsonKind.String) row.AlertsFile = alerts.String;
                var alertsHash = item.Get("alerts_sha256");
                if (alertsHash != null && alertsHash.Kind == JsonKind.String) row.AlertsSha256 = alertsHash.String;
                if (next.ContainsKey(row.CaseId))
                    throw new EffectException("data/cases/index.json repeats case_id " + row.CaseId + ".");
                next[row.CaseId] = row;
            }
            Index = next;
        }

        static JsonValue ReadChecked(string path, string expectedHash, string label)
        {
            if (!File.Exists(path))
                throw new EffectException("Could not read " + label + " at " + path + ".");
            var bytes = File.ReadAllBytes(path);
            var digest = Sha256Hex(bytes);
            if (!string.Equals(digest, expectedHash, StringComparison.OrdinalIgnoreCase))
                throw new EffectException(label + " does not match data/cases/index.json. Run node scripts/validate-cases.mjs.");
            return JsonParse.Parse(new UTF8Encoding(false).GetString(bytes));
        }

        static string Sha256Hex(byte[] bytes)
        {
            using (var sha = SHA256.Create())
            {
                var hash = sha.ComputeHash(bytes);
                var builder = new StringBuilder(hash.Length * 2);
                for (var i = 0; i < hash.Length; i++) builder.Append(hash[i].ToString("x2"));
                return builder.ToString();
            }
        }

        static string Required(JsonValue obj, string key)
        {
            var value = obj != null ? obj.Get(key) : null;
            if (value == null || value.Kind != JsonKind.String || value.String.Length == 0)
                throw new EffectException("index.json is missing " + key + ".");
            return value.String;
        }

        sealed class IndexRow
        {
            public string CaseId = "";
            public string File = "";
            public string Sha256 = "";
            public string AlertsFile = "";
            public string AlertsSha256 = "";
        }
    }
}
