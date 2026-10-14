using System;
using System.Collections.Generic;

namespace TwinAml
{
    public sealed class EffectException : Exception
    {
        public EffectException(string message) : base(message) { }
    }

    public sealed class PlayResult
    {
        public JsonValue Twin;
        public string NodeId;
        public List<string> NodesEntered = new List<string>();
        public List<string> ChoicesApplied = new List<string>();
    }

    /// <summary>
    /// Schema 0.1 patch apply. Same order as docs/effects.md and scripts/apply-effects.mjs.
    /// This is the Editor-room mirror. It does not replace the Worker state machine (P1-S2).
    /// </summary>
    public static class EffectApplier
    {
        public static PlayResult Play(JsonValue script, IList<string> choiceIds)
        {
            if (script == null) throw new EffectException("Script is missing.");
            var twin = script.Require("initial_twin_state").Clone();
            var nodes = script.Require("nodes");
            if (nodes.Kind != JsonKind.Array) throw new EffectException("nodes is not an array.");
            var byId = new Dictionary<string, JsonValue>();
            for (var i = 0; i < nodes.Array.Count; i++)
            {
                var item = nodes.Array[i];
                byId[item.Require("id").String] = item;
            }

            var start = script.Require("start_node_id").String;
            JsonValue node;
            if (!byId.TryGetValue(start, out node))
                throw new EffectException("start_node_id " + start + " is missing.");

            var queue = new List<string>();
            if (choiceIds != null)
            {
                for (var i = 0; i < choiceIds.Count; i++) queue.Add(choiceIds[i]);
            }

            var result = new PlayResult { Twin = twin };
            var limit = nodes.Array.Count + queue.Count + 2;
            for (var step = 0; step < limit; step++)
            {
                result.NodesEntered.Add(node.Require("id").String);
                if (node.Has("twin_patch")) ApplyPatch(twin, node.Get("twin_patch"));
                var type = node.Require("type").String;
                if (type == "outcome")
                {
                    result.NodeId = node.Require("id").String;
                    return result;
                }
                if (type == "scene")
                {
                    var nextId = node.Require("next").String;
                    if (!byId.TryGetValue(nextId, out node))
                        throw new EffectException("scene " + result.NodesEntered[result.NodesEntered.Count - 1] + " next " + nextId + " is missing.");
                    continue;
                }
                if (type == "decision")
                {
                    if (queue.Count == 0)
                        throw new EffectException("missing choice on " + node.Require("id").String);
                    var choiceId = queue[0];
                    queue.RemoveAt(0);
                    JsonValue choice = null;
                    var choices = node.Require("choices");
                    for (var c = 0; c < choices.Array.Count; c++)
                    {
                        if (choices.Array[c].Require("id").String == choiceId)
                        {
                            choice = choices.Array[c];
                            break;
                        }
                    }
                    if (choice == null)
                        throw new EffectException("missing choice " + choiceId + " on " + node.Require("id").String);
                    if (choice.Has("effects")) ApplyPatch(twin, choice.Get("effects"));
                    result.ChoicesApplied.Add(choiceId);
                    var nextId = choice.Require("next").String;
                    if (!byId.TryGetValue(nextId, out node))
                        throw new EffectException("choice " + choiceId + " next " + nextId + " is missing.");
                    continue;
                }
                throw new EffectException("unknown node type " + type);
            }
            throw new EffectException("play exceeded the node step limit");
        }

        public static void ApplyPatch(JsonValue twin, JsonValue patch)
        {
            if (patch == null) return;
            if (patch.Kind != JsonKind.Object)
                throw new EffectException("patch is not an object");
            for (var i = 0; i < patch.Object.Count; i++)
            {
                var key = patch.Object[i].Key;
                var value = patch.Object[i].Value;
                if (key.Length == 0 || key.StartsWith(".", StringComparison.Ordinal) || key.EndsWith(".", StringComparison.Ordinal) || key.IndexOf("..", StringComparison.Ordinal) >= 0)
                    throw new EffectException("empty path segment in \"" + key + "\"");
                var parts = key.Split('.');
                var last = parts[parts.Length - 1];
                if (last == "flags_add")
                {
                    if (value.Kind != JsonKind.Array) throw new EffectException(key + " must be an array of strings");
                    var incoming = new List<string>();
                    for (var a = 0; a < value.Array.Count; a++)
                    {
                        if (value.Array[a].Kind != JsonKind.String) throw new EffectException(key + " must be an array of strings");
                        incoming.Add(value.Array[a].String);
                    }
                    var target = new string[parts.Length];
                    for (var p = 0; p < parts.Length - 1; p++) target[p] = parts[p];
                    target[target.Length - 1] = "flags";
                    var parent = ParentOf(twin, target);
                    var leaf = target[target.Length - 1];
                    var flags = parent != null ? parent.Get(leaf) : null;
                    if (parent == null || flags == null || flags.Kind != JsonKind.Array)
                        throw new EffectException(key + " needs an existing array at " + string.Join(".", target));
                    for (var a = 0; a < incoming.Count; a++)
                    {
                        var found = false;
                        for (var f = 0; f < flags.Array.Count; f++)
                        {
                            if (flags.Array[f].Kind == JsonKind.String && flags.Array[f].String == incoming[a])
                            {
                                found = true;
                                break;
                            }
                        }
                        if (!found) flags.Array.Add(new JsonValue { Kind = JsonKind.String, String = incoming[a] });
                    }
                    continue;
                }
                if (last == "score_delta")
                {
                    if (value.Kind != JsonKind.Number || double.IsNaN(value.Number) || double.IsInfinity(value.Number))
                        throw new EffectException(key + " must be a finite number");
                    var target = new string[parts.Length];
                    for (var p = 0; p < parts.Length - 1; p++) target[p] = parts[p];
                    target[target.Length - 1] = "score";
                    var parent = ParentOf(twin, target);
                    var leaf = target[target.Length - 1];
                    var score = parent != null ? parent.Get(leaf) : null;
                    if (parent == null || score == null || score.Kind != JsonKind.Number)
                        throw new EffectException(key + " needs an existing number at " + string.Join(".", target));
                    score.Number += value.Number;
                    continue;
                }
                if (last.EndsWith("_add", StringComparison.Ordinal) || last.EndsWith("_delta", StringComparison.Ordinal))
                    throw new EffectException(key + " uses an undefined suffix. Defined suffixes are flags_add and score_delta.");
                var replaceParent = ParentOf(twin, parts);
                if (replaceParent == null)
                    throw new EffectException(key + " has no parent object");
                SetMember(replaceParent, parts[parts.Length - 1], value.Clone());
            }
        }

        static JsonValue ParentOf(JsonValue state, string[] parts)
        {
            var current = state;
            for (var i = 0; i < parts.Length - 1; i++)
            {
                if (current == null || current.Kind != JsonKind.Object) return null;
                if (!current.TryGet(parts[i], out var next) || next == null) return null;
                current = next;
            }
            if (current == null || current.Kind != JsonKind.Object) return null;
            return current;
        }

        static void SetMember(JsonValue parent, string key, JsonValue value)
        {
            for (var i = 0; i < parent.Object.Count; i++)
            {
                if (parent.Object[i].Key == key)
                {
                    parent.Object[i] = new JsonMember(key, value);
                    return;
                }
            }
            parent.Object.Add(new JsonMember(key, value));
        }
    }
}
