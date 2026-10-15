using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace TwinAml
{
    public enum JsonKind
    {
        Null,
        Bool,
        Number,
        String,
        Array,
        Object
    }

    /// <summary>
    /// Order-preserving JSON DOM. Object key order matches the file, which is
    /// what docs/effects.md requires when several keys share one patch.
    /// </summary>
    public sealed class JsonValue
    {
        public JsonKind Kind;
        public bool Bool;
        public double Number;
        public string String;
        public List<JsonValue> Array;
        public List<JsonMember> Object;

        public static JsonValue Null()
        {
            return new JsonValue { Kind = JsonKind.Null };
        }

        public bool Has(string key)
        {
            return TryGet(key, out _);
        }

        public JsonValue Get(string key)
        {
            TryGet(key, out var value);
            return value;
        }

        public bool TryGet(string key, out JsonValue value)
        {
            value = null;
            if (Kind != JsonKind.Object || Object == null) return false;
            for (var i = 0; i < Object.Count; i++)
            {
                if (Object[i].Key == key)
                {
                    value = Object[i].Value;
                    return true;
                }
            }
            return false;
        }

        public JsonValue Require(string key)
        {
            if (!TryGet(key, out var value) || value == null)
                throw new EffectException("Missing key \"" + key + "\".");
            return value;
        }

        public JsonValue Clone()
        {
            var copy = new JsonValue { Kind = Kind, Bool = Bool, Number = Number, String = String };
            if (Kind == JsonKind.Array && Array != null)
            {
                copy.Array = new List<JsonValue>(Array.Count);
                for (var i = 0; i < Array.Count; i++) copy.Array.Add(Array[i].Clone());
            }
            if (Kind == JsonKind.Object && Object != null)
            {
                copy.Object = new List<JsonMember>(Object.Count);
                for (var i = 0; i < Object.Count; i++)
                {
                    copy.Object.Add(new JsonMember(Object[i].Key, Object[i].Value.Clone()));
                }
            }
            return copy;
        }

        public string ToJson()
        {
            var builder = new StringBuilder();
            WriteJson(builder);
            return builder.ToString();
        }

        void WriteJson(StringBuilder builder)
        {
            switch (Kind)
            {
                case JsonKind.Null:
                    builder.Append("null");
                    break;
                case JsonKind.Bool:
                    builder.Append(Bool ? "true" : "false");
                    break;
                case JsonKind.Number:
                    builder.Append(Number.ToString("R", CultureInfo.InvariantCulture));
                    break;
                case JsonKind.String:
                    builder.Append('"');
                    AppendEscaped(builder, String ?? "");
                    builder.Append('"');
                    break;
                case JsonKind.Array:
                    builder.Append('[');
                    for (var i = 0; i < Array.Count; i++)
                    {
                        if (i > 0) builder.Append(',');
                        Array[i].WriteJson(builder);
                    }
                    builder.Append(']');
                    break;
                case JsonKind.Object:
                    builder.Append('{');
                    for (var i = 0; i < Object.Count; i++)
                    {
                        if (i > 0) builder.Append(',');
                        builder.Append('"');
                        AppendEscaped(builder, Object[i].Key);
                        builder.Append("\":");
                        Object[i].Value.WriteJson(builder);
                    }
                    builder.Append('}');
                    break;
            }
        }

        static void AppendEscaped(StringBuilder builder, string value)
        {
            for (var i = 0; i < value.Length; i++)
            {
                var c = value[i];
                switch (c)
                {
                    case '"': builder.Append("\\\""); break;
                    case '\\': builder.Append("\\\\"); break;
                    case '\b': builder.Append("\\b"); break;
                    case '\f': builder.Append("\\f"); break;
                    case '\n': builder.Append("\\n"); break;
                    case '\r': builder.Append("\\r"); break;
                    case '\t': builder.Append("\\t"); break;
                    default:
                        if (c < 32) builder.Append("\\u").Append(((int)c).ToString("x4"));
                        else builder.Append(c);
                        break;
                }
            }
        }
    }

    public sealed class JsonMember
    {
        public readonly string Key;
        public readonly JsonValue Value;

        public JsonMember(string key, JsonValue value)
        {
            Key = key;
            Value = value;
        }
    }

    public static class JsonParse
    {
        public static JsonValue Parse(string text)
        {
            if (text == null) throw new EffectException("JSON text is null.");
            var parser = new Parser(text);
            var value = parser.ReadValue();
            parser.SkipSpace();
            if (!parser.End) throw new EffectException("Trailing data after JSON value.");
            return value;
        }

        sealed class Parser
        {
            readonly string _text;
            int _index;

            public Parser(string text)
            {
                _text = text;
            }

            public bool End => _index >= _text.Length;

            public void SkipSpace()
            {
                while (_index < _text.Length && char.IsWhiteSpace(_text[_index])) _index++;
            }

            public JsonValue ReadValue()
            {
                SkipSpace();
                if (_index >= _text.Length) throw new EffectException("Unexpected end of JSON.");
                var c = _text[_index];
                if (c == '{') return ReadObject();
                if (c == '[') return ReadArray();
                if (c == '"') return new JsonValue { Kind = JsonKind.String, String = ReadString() };
                if (c == 't') return ReadLiteral("true", new JsonValue { Kind = JsonKind.Bool, Bool = true });
                if (c == 'f') return ReadLiteral("false", new JsonValue { Kind = JsonKind.Bool, Bool = false });
                if (c == 'n') return ReadLiteral("null", JsonValue.Null());
                if (c == '-' || char.IsDigit(c)) return ReadNumber();
                throw new EffectException("Unexpected JSON character at " + _index + ".");
            }

            JsonValue ReadObject()
            {
                _index++;
                var members = new List<JsonMember>();
                SkipSpace();
                if (Peek('}'))
                {
                    _index++;
                    return new JsonValue { Kind = JsonKind.Object, Object = members };
                }
                while (true)
                {
                    SkipSpace();
                    var key = ReadString();
                    SkipSpace();
                    Expect(':');
                    var value = ReadValue();
                    members.Add(new JsonMember(key, value));
                    SkipSpace();
                    if (Peek('}'))
                    {
                        _index++;
                        break;
                    }
                    Expect(',');
                }
                return new JsonValue { Kind = JsonKind.Object, Object = members };
            }

            JsonValue ReadArray()
            {
                _index++;
                var items = new List<JsonValue>();
                SkipSpace();
                if (Peek(']'))
                {
                    _index++;
                    return new JsonValue { Kind = JsonKind.Array, Array = items };
                }
                while (true)
                {
                    items.Add(ReadValue());
                    SkipSpace();
                    if (Peek(']'))
                    {
                        _index++;
                        break;
                    }
                    Expect(',');
                }
                return new JsonValue { Kind = JsonKind.Array, Array = items };
            }

            JsonValue ReadNumber()
            {
                var start = _index;
                if (Peek('-')) _index++;
                while (_index < _text.Length && char.IsDigit(_text[_index])) _index++;
                if (Peek('.'))
                {
                    _index++;
                    while (_index < _text.Length && char.IsDigit(_text[_index])) _index++;
                }
                if (Peek('e') || Peek('E'))
                {
                    _index++;
                    if (Peek('+') || Peek('-')) _index++;
                    while (_index < _text.Length && char.IsDigit(_text[_index])) _index++;
                }
                var slice = _text.Substring(start, _index - start);
                if (!double.TryParse(slice, NumberStyles.Float, CultureInfo.InvariantCulture, out var number))
                    throw new EffectException("Bad number \"" + slice + "\".");
                return new JsonValue { Kind = JsonKind.Number, Number = number };
            }

            string ReadString()
            {
                if (!Peek('"')) throw new EffectException("Expected a string at " + _index + ".");
                _index++;
                var builder = new StringBuilder();
                while (_index < _text.Length)
                {
                    var c = _text[_index++];
                    if (c == '"') return builder.ToString();
                    if (c != '\\')
                    {
                        builder.Append(c);
                        continue;
                    }
                    if (_index >= _text.Length) break;
                    var esc = _text[_index++];
                    switch (esc)
                    {
                        case '"':
                        case '\\':
                        case '/':
                            builder.Append(esc);
                            break;
                        case 'b': builder.Append('\b'); break;
                        case 'f': builder.Append('\f'); break;
                        case 'n': builder.Append('\n'); break;
                        case 'r': builder.Append('\r'); break;
                        case 't': builder.Append('\t'); break;
                        case 'u':
                            if (_index + 4 > _text.Length) throw new EffectException("Short unicode escape.");
                            var hex = _text.Substring(_index, 4);
                            _index += 4;
                            builder.Append((char)int.Parse(hex, NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                            break;
                        default:
                            throw new EffectException("Bad escape \\" + esc + ".");
                    }
                }
                throw new EffectException("Unterminated string.");
            }

            JsonValue ReadLiteral(string literal, JsonValue value)
            {
                if (_index + literal.Length > _text.Length || _text.Substring(_index, literal.Length) != literal)
                    throw new EffectException("Expected " + literal + ".");
                _index += literal.Length;
                return value;
            }

            bool Peek(char c)
            {
                return _index < _text.Length && _text[_index] == c;
            }

            void Expect(char c)
            {
                if (!Peek(c)) throw new EffectException("Expected '" + c + "' at " + _index + ".");
                _index++;
            }
        }
    }
}
