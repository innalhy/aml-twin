using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEngine;

namespace TwinAml
{
    public static class CaseLibrary
    {
        static readonly Dictionary<string, JsonValue> Cache = new Dictionary<string, JsonValue>();

        public const string T01File = "01-deepfake-hk-001.example.json";
        public const string T01CaseId = "deepfake-hk-001";
        public const string T02File = "06-greythunder-mule-001.example.json";
        public const string T02CaseId = "hk-greythunder-mule-001";

        public static JsonValue Load(string fileName)
        {
            if (Cache.TryGetValue(fileName, out var cached)) return cached;
            var tried = new List<string>();
            var paths = Candidates(fileName);
            for (var i = 0; i < paths.Count; i++)
            {
                tried.Add(paths[i]);
                if (!File.Exists(paths[i])) continue;
                var text = File.ReadAllText(paths[i], new UTF8Encoding(false));
                var parsed = JsonParse.Parse(text);
                var caseId = parsed.Get("case_id");
                if (caseId == null || caseId.Kind != JsonKind.String)
                    throw new EffectException(fileName + " has no case_id.");
                Cache[fileName] = parsed;
                return parsed;
            }
            throw new EffectException("Could not read " + fileName + ". Tried:\n" + string.Join("\n", tried.ToArray()));
        }

        public static JsonValue FindNode(JsonValue script, string nodeId)
        {
            if (script == null) return null;
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

        public static List<string> Candidates(string fileName)
        {
            var list = new List<string>();
            list.Add(Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "..", "data", "cases", fileName)));
            list.Add(Path.Combine(Application.streamingAssetsPath, "cases", fileName));
            return list;
        }
    }
}
