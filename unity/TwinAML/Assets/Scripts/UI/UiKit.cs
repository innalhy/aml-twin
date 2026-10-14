using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using UnityEngine.Video;

namespace TwinAml
{
    public enum Btn
    {
        Slate,
        Soft,
        Orange,
        Danger,
        Pass
    }

    public static class UiKit
    {
        public static readonly Color32 Bg = new Color32(0xee, 0xf2, 0xf6, 0xff);
        public static readonly Color32 Header = new Color32(0x0d, 0x21, 0x37, 0xff);
        public static readonly Color32 Card = new Color32(0xff, 0xff, 0xff, 0xff);
        public static readonly Color32 Ink = new Color32(0x1a, 0x24, 0x32, 0xff);
        public static readonly Color32 Muted = new Color32(0x5c, 0x6b, 0x7a, 0xff);
        public static readonly Color32 Orange = new Color32(0xf5, 0xa5, 0x24, 0xff);
        public static readonly Color32 OrangeInk = new Color32(0x1a, 0x12, 0x04, 0xff);
        public static readonly Color32 Danger = new Color32(0x9f, 0x2d, 0x2a, 0xff);
        public static readonly Color32 Pass = new Color32(0x1f, 0x8a, 0x5b, 0xff);
        public static readonly Color32 Slate = new Color32(0x2f, 0x6f, 0xed, 0xff);
        public static readonly Color32 Soft = new Color32(0xe7, 0xef, 0xfc, 0xff);
        public static readonly Color32 Slot = new Color32(0xf7, 0xf9, 0xfb, 0xff);
        public static readonly Color32 White = new Color32(0xff, 0xff, 0xff, 0xff);
        public static readonly Color32 Line = new Color32(0xd5, 0xde, 0xe8, 0xff);
        public static readonly Color32 Track = new Color32(0xe6, 0xeb, 0xf1, 0xff);
        public static readonly Color32 Chip = new Color32(0x1b, 0x3a, 0x56, 0xff);

        const float ContentW = 1120f;
        const float TextWidth = 1064f;
        const float HeaderH = 72f;
        const float StripH = 32f;
        const float StepH = 56f;
        const float FooterH = 32f;

        static readonly Dictionary<string, Texture2D> Textures = new Dictionary<string, Texture2D>();

        static Font _font;
        static RectTransform _content;
        static float _y;
        static bool _inCard;
        static float _cardStart;
        static int _cardSibling;

        public static Font Font
        {
            get
            {
                if (_font != null) return _font;
                _font = Resources.Load<Font>("TwinAmlSans-Subset");
                if (_font == null)
                {
                    _font = Font.CreateDynamicFontFromOSFont(new[]
                    {
                        "PingFang TC",
                        "PingFang HK",
                        "Heiti TC",
                        "Microsoft JhengHei",
                        "Microsoft JhengHei UI",
                        "Noto Sans CJK TC",
                        "Noto Sans TC",
                        "Source Han Sans TC",
                        "WenQuanYi Micro Hei",
                        "Droid Sans Fallback"
                    }, 32);
                }
                if (_font == null) _font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
                if (_font == null) _font = Resources.GetBuiltinResource<Font>("Arial.ttf");
                return _font;
            }
        }

        public static void BuildShell(SceneId id)
        {
            DestroyNamed("TwinAML.UI");
            DestroyNamed("TwinAML.EventSystem");

            var canvasGo = new GameObject("TwinAML.UI");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
            canvasGo.AddComponent<GraphicRaycaster>();

            var bg = CreateStretch(canvasGo.transform, "Background");
            var bgImage = bg.gameObject.AddComponent<Image>();
            bgImage.color = Bg;
            bgImage.raycastTarget = false;

            var header = TopBand(canvasGo.transform, "Header", 0f, HeaderH);
            var headerImage = header.gameObject.AddComponent<Image>();
            headerImage.color = Header;
            headerImage.raycastTarget = false;
            var mark = Pin(header, "Mark", 24f, 16f, 40f, 40f);
            var markImage = mark.gameObject.AddComponent<RawImage>();
            markImage.texture = Rounded(40, 40, 10);
            markImage.color = Slate;
            markImage.raycastTarget = false;
            var markText = CreateText(mark, "T", 22, FontStyle.Bold, White, TextAnchor.MiddleCenter);
            Stretch(markText.rectTransform, 0f, 0f, 0f, 0f);
            var title = CreateText(header, Locale.T("portal.title"), 22, FontStyle.Bold, White, TextAnchor.MiddleLeft);
            var titleRect = title.rectTransform;
            titleRect.anchorMin = new Vector2(0f, 0f);
            titleRect.anchorMax = new Vector2(0f, 1f);
            titleRect.pivot = new Vector2(0f, 0.5f);
            titleRect.anchoredPosition = new Vector2(76f, 0f);
            titleRect.sizeDelta = new Vector2(980f, 0f);
            var scene = CreateText(header, id.ToString(), 14, FontStyle.Normal, new Color32(0xd5, 0xde, 0xea, 0xff), TextAnchor.MiddleRight);
            var sceneRect = scene.rectTransform;
            sceneRect.anchorMin = new Vector2(1f, 0.5f);
            sceneRect.anchorMax = new Vector2(1f, 0.5f);
            sceneRect.pivot = new Vector2(1f, 0.5f);
            sceneRect.anchoredPosition = new Vector2(-112f, 0f);
            sceneRect.sizeDelta = new Vector2(420f, 28f);
            var lang = PinRight(header, "Lang", 24f, 72f, 40f);
            var langImage = lang.gameObject.AddComponent<RawImage>();
            langImage.texture = Rounded(72, 40, 8);
            langImage.color = Chip;
            var langButton = lang.gameObject.AddComponent<Button>();
            langButton.targetGraphic = langImage;
            langButton.onClick.AddListener(() =>
            {
                FlowController.Instance.SetLocale(Locale.Current == LocaleCode.En ? LocaleCode.Zh : LocaleCode.En);
            });
            var langText = CreateText(lang, Locale.T("portal.lang"), 15, FontStyle.Bold, White, TextAnchor.MiddleCenter);
            Stretch(langText.rectTransform, 4f, 2f, 4f, 2f);

            var strip = TopBand(canvasGo.transform, "Disclaimer", HeaderH, StripH);
            var stripImage = strip.gameObject.AddComponent<Image>();
            stripImage.color = new Color32(0xe4, 0xeb, 0xf2, 0xff);
            stripImage.raycastTarget = false;
            var stripText = CreateText(strip, Locale.T("banner"), 14, FontStyle.Normal, Muted, TextAnchor.MiddleLeft);
            var stripRect = stripText.rectTransform;
            stripRect.anchorMin = Vector2.zero;
            stripRect.anchorMax = Vector2.one;
            stripRect.offsetMin = new Vector2(28f, 2f);
            stripRect.offsetMax = new Vector2(-28f, -2f);

            var step = StepIndex(id);
            var stepH = step < 0 ? 0f : StepH;
            if (step >= 0) BuildStepper(canvasGo.transform, id, step);

            var footer = CreateStretch(canvasGo.transform, "Footer");
            footer.anchorMin = new Vector2(0f, 0f);
            footer.anchorMax = new Vector2(1f, 0f);
            footer.pivot = new Vector2(0.5f, 0f);
            footer.offsetMin = new Vector2(0f, 0f);
            footer.offsetMax = new Vector2(0f, FooterH);
            var footerImage = footer.gameObject.AddComponent<Image>();
            footerImage.color = new Color32(0xe4, 0xeb, 0xf2, 0xff);
            footerImage.raycastTarget = false;
            var footerText = CreateText(footer, Locale.T("footer"), 14, FontStyle.Normal, Muted, TextAnchor.MiddleLeft);
            var footerRect = footerText.rectTransform;
            footerRect.anchorMin = Vector2.zero;
            footerRect.anchorMax = Vector2.one;
            footerRect.offsetMin = new Vector2(28f, 2f);
            footerRect.offsetMax = new Vector2(-28f, -2f);

            var scrollGo = new GameObject("Scroll", typeof(RectTransform));
            scrollGo.transform.SetParent(canvasGo.transform, false);
            var scrollRect = scrollGo.GetComponent<RectTransform>();
            scrollRect.anchorMin = Vector2.zero;
            scrollRect.anchorMax = Vector2.one;
            scrollRect.offsetMin = new Vector2(0f, FooterH);
            scrollRect.offsetMax = new Vector2(0f, -(HeaderH + StripH + stepH));
            var scroll = scrollGo.AddComponent<ScrollRect>();
            scroll.horizontal = false;
            scroll.vertical = true;
            scroll.movementType = ScrollRect.MovementType.Clamped;
            scroll.scrollSensitivity = 28f;

            var viewport = CreateStretch(scrollGo.transform, "Viewport");
            viewport.gameObject.AddComponent<RectMask2D>();
            viewport.gameObject.AddComponent<Image>().color = new Color(0f, 0f, 0f, 0.01f);
            scroll.viewport = viewport;

            var contentGo = new GameObject("Content", typeof(RectTransform));
            contentGo.transform.SetParent(viewport, false);
            _content = contentGo.GetComponent<RectTransform>();
            _content.anchorMin = new Vector2(0.5f, 1f);
            _content.anchorMax = new Vector2(0.5f, 1f);
            _content.pivot = new Vector2(0.5f, 1f);
            _content.anchoredPosition = Vector2.zero;
            _content.sizeDelta = new Vector2(ContentW, 400f);
            scroll.content = _content;

            var events = new GameObject("TwinAML.EventSystem");
            events.AddComponent<EventSystem>();
            events.AddComponent<StandaloneInputModule>();

            _y = 20f;
            _inCard = false;
        }

        public static void Finish()
        {
            if (_content == null) return;
            _content.sizeDelta = new Vector2(ContentW, _y + 28f);
        }

        public static void Gap(float height)
        {
            _y += height;
        }

        public static void BeginCard()
        {
            _inCard = true;
            _cardStart = _y;
            _cardSibling = _content.childCount;
            _y += 16f;
        }

        public static void EndCard()
        {
            _y += 16f;
            var height = _y - _cardStart;
            var imageGo = new GameObject("Card", typeof(RectTransform));
            imageGo.transform.SetParent(_content, false);
            imageGo.transform.SetSiblingIndex(_cardSibling);
            var rect = imageGo.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(1f, 1f);
            rect.pivot = new Vector2(0.5f, 1f);
            rect.offsetMin = new Vector2(28f, -_cardStart - height);
            rect.offsetMax = new Vector2(-28f, -_cardStart);
            var image = imageGo.AddComponent<RawImage>();
            image.texture = Rounded(Math.Max(8, (int)(ContentW - 56f)), Math.Max(8, (int)height), 16);
            image.color = Card;
            image.raycastTarget = false;
            _inCard = false;
            _y += 14f;
        }

        public static void Title(string text)
        {
            AddText(text, 32, FontStyle.Bold, Ink);
        }

        public static void Heading(string text)
        {
            AddText(text, 22, FontStyle.Bold, Ink);
        }

        public static void Body(string text)
        {
            AddText(text, 20, FontStyle.Normal, Ink);
        }

        public static void Note(string text)
        {
            AddText(text, 17, FontStyle.Normal, Muted);
        }

        public static void Button(string label, Btn kind, Action onClick)
        {
            var height = Mathf.Max(52f, Estimate(label, 20) + 18f);
            var rect = AddBlock("Button", height);
            var inset = _inCard ? 48f : 28f;
            PaintButton(rect, label, kind, onClick, ContentW - inset * 2f, height);
        }

        public static void ButtonRow(string left, Btn leftKind, Action onLeft, string right, Btn rightKind, Action onRight)
        {
            var height = Mathf.Max(64f, Mathf.Max(Estimate(left, 20), Estimate(right, 20)) + 20f);
            var row = AddBlock("Row", height);
            var leftRect = ChildHalf(row, true);
            var rightRect = ChildHalf(row, false);
            var inset = _inCard ? 48f : 28f;
            var half = (ContentW - inset * 2f - 12f) / 2f;
            PaintButton(leftRect, left, leftKind, onLeft, half, height);
            PaintButton(rightRect, right, rightKind, onRight, half, height);
        }

        public static void Input(string value, string placeholder, Action<string> onChange)
        {
            var rect = AddBlock("Input", 52f);
            var image = rect.gameObject.AddComponent<RawImage>();
            var inset = _inCard ? 48f : 28f;
            image.texture = Rounded(Math.Max(8, (int)(ContentW - inset * 2f)), 52, 8);
            image.color = Slot;
            var text = CreateText(rect, "", 22, FontStyle.Normal, Ink, TextAnchor.MiddleLeft);
            Stretch(text.rectTransform, 14f, 8f, 14f, 8f);
            var field = rect.gameObject.AddComponent<InputField>();
            field.textComponent = text;
            field.targetGraphic = image;
            field.text = value ?? "";
            field.lineType = InputField.LineType.SingleLine;
            if (onChange != null) field.onValueChanged.AddListener(next => onChange(next));
            if (!string.IsNullOrEmpty(placeholder))
            {
                var ph = CreateText(rect, placeholder, 22, FontStyle.Italic, Muted, TextAnchor.MiddleLeft);
                Stretch(ph.rectTransform, 14f, 8f, 14f, 8f);
                field.placeholder = ph;
            }
        }

        public static void VideoSlot(string absolutePath, string missingCaption, string foundCaption)
        {
            var exists = !string.IsNullOrEmpty(absolutePath) && File.Exists(absolutePath);
            var rect = AddBlock("VideoSlot", 360f);
            var image = rect.gameObject.AddComponent<RawImage>();
            image.color = Slot;
            if (exists)
            {
                try
                {
                    var texture = new RenderTexture(960, 540, 0);
                    image.texture = texture;
                    image.color = Color.white;
                    var player = rect.gameObject.AddComponent<VideoPlayer>();
                    player.playOnAwake = false;
                    player.source = VideoSource.Url;
                    player.url = new Uri(absolutePath).AbsoluteUri;
                    player.renderMode = VideoRenderMode.RenderTexture;
                    player.targetTexture = texture;
                    player.audioOutputMode = VideoAudioOutputMode.None;
                    player.isLooping = true;
                    player.Play();
                }
                catch (Exception err)
                {
                    image.texture = null;
                    image.color = Slot;
                    Debug.LogWarning("TwinAML video slot: " + err.Message);
                    exists = false;
                }
            }
            var caption = CreateText(rect, exists ? foundCaption : missingCaption, 18, FontStyle.Normal, Muted, TextAnchor.LowerLeft);
            Stretch(caption.rectTransform, 16f, 12f, 16f, 12f);
            Note(exists ? absolutePath : (string.IsNullOrEmpty(absolutePath) ? "" : absolutePath));
        }

        static void AddText(string text, int size, FontStyle style, Color32 color)
        {
            if (string.IsNullOrEmpty(text)) return;
            var height = Estimate(text, size);
            var rect = AddBlock("Text", height);
            var label = CreateText(rect, text, size, style, color, TextAnchor.UpperLeft);
            Stretch(label.rectTransform, 0f, 0f, 0f, 0f);
        }

        static RectTransform AddBlock(string name, float height)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(_content, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(1f, 1f);
            rect.pivot = new Vector2(0.5f, 1f);
            var left = _inCard ? 48f : 28f;
            var right = _inCard ? 48f : 28f;
            rect.offsetMin = new Vector2(left, -_y - height);
            rect.offsetMax = new Vector2(-right, -_y);
            _y += height + 10f;
            return rect;
        }

        static float Estimate(string text, int size)
        {
            if (string.IsNullOrEmpty(text)) return size + 8f;
            var lines = 1;
            var used = 0f;
            var limit = TextWidth - (_inCard ? 40f : 0f);
            for (var i = 0; i < text.Length; i++)
            {
                var c = text[i];
                if (c == '\n')
                {
                    lines++;
                    used = 0f;
                    continue;
                }
                var width = c <= 127 ? size * 0.56f : size * 1.02f;
                if (used + width > limit && used > 0f)
                {
                    lines++;
                    used = width;
                }
                else used += width;
            }
            return lines * (size + 10f) + 8f;
        }

        static void PaintButton(RectTransform rect, string label, Btn kind, Action onClick, float w, float h)
        {
            var image = rect.gameObject.AddComponent<RawImage>();
            image.texture = Rounded(Math.Max(8, (int)Math.Round(w)), Math.Max(8, (int)Math.Round(h)), 8);
            image.color = ButtonColor(kind);
            var button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            if (onClick != null) button.onClick.AddListener(() => onClick());
            var text = CreateText(rect, label, 18, FontStyle.Bold, ButtonInk(kind), TextAnchor.MiddleCenter);
            Stretch(text.rectTransform, 12f, 8f, 12f, 8f);
        }

        static RectTransform ChildHalf(RectTransform row, bool left)
        {
            var go = new GameObject(left ? "Left" : "Right", typeof(RectTransform));
            go.transform.SetParent(row, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(left ? 0f : 0.5f, 0f);
            rect.anchorMax = new Vector2(left ? 0.5f : 1f, 1f);
            rect.offsetMin = new Vector2(left ? 0f : 6f, 0f);
            rect.offsetMax = new Vector2(left ? -6f : 0f, 0f);
            return rect;
        }

        static void BuildStepper(Transform canvas, SceneId id, int current)
        {
            var keys = StepKeys(id);
            var band = TopBand(canvas, "Stepper", HeaderH + StripH, StepH);
            var bandImage = band.gameObject.AddComponent<Image>();
            bandImage.color = White;
            bandImage.raycastTarget = false;
            var hair = Pin(band, "Hairline", 0f, StepH - 1f, 1920f, 1f);
            var hairImage = hair.gameObject.AddComponent<Image>();
            hairImage.color = Line;
            hairImage.raycastTarget = false;

            const float margin = 48f;
            var span = 1920f - margin * 2f;
            var col = span / keys.Length;
            var track = Pin(band, "Track", margin, 8f, span, 3f);
            var trackImage = track.gameObject.AddComponent<Image>();
            trackImage.color = Track;
            trackImage.raycastTarget = false;
            var fillW = col * (current + 0.5f);
            if (current >= keys.Length - 1) fillW = span;
            var fill = Pin(band, "Fill", margin, 8f, fillW, 3f);
            var fillImage = fill.gameObject.AddComponent<Image>();
            fillImage.color = Slate;
            fillImage.raycastTarget = false;

            for (var i = 0; i < keys.Length; i++)
            {
                var past = i < current;
                var on = i == current;
                var color = on ? Slate : past ? Pass : Muted;
                var style = on ? FontStyle.Bold : FontStyle.Normal;
                var cell = Pin(band, "Step", margin + i * col, 16f, col, 34f);
                var label = Locale.T(keys[i]);
                if (i < keys.Length - 1) label = label + "   →";
                var text = CreateText(cell, label, 16, style, color, TextAnchor.MiddleCenter);
                Stretch(text.rectTransform, 4f, 0f, 4f, 0f);
            }
        }

        static int StepIndex(SceneId id)
        {
            switch (id)
            {
                case SceneId.Scn_T01_Brief: return 0;
                case SceneId.Scn_T01_Inbox: return 1;
                case SceneId.Scn_T01_Meeting: return 2;
                case SceneId.Scn_T01_PayDesk:
                case SceneId.Scn_T01_Report: return 3;
                case SceneId.Scn_T01_Trap:
                case SceneId.Scn_T01_Pass:
                case SceneId.Scn_T01_Teach: return 4;
                case SceneId.Scn_T02_Brief: return 0;
                case SceneId.Scn_T02_Statement: return 1;
                case SceneId.Scn_T02_Chain: return 2;
                case SceneId.Scn_T02_Decision: return 3;
                case SceneId.Scn_T02_FeedbackA:
                case SceneId.Scn_T02_FeedbackPass: return 4;
                default: return -1;
            }
        }

        static string[] StepKeys(SceneId id)
        {
            var name = id.ToString();
            if (name.IndexOf("_T01_", StringComparison.Ordinal) >= 0)
                return new[] { "step.t01.1", "step.t01.2", "step.t01.3", "step.t01.4", "step.t01.5" };
            return new[] { "step.t02.1", "step.t02.2", "step.t02.3", "step.t02.4", "step.t02.5" };
        }

        static Text CreateText(Transform parent, string value, int size, FontStyle style, Color32 color, TextAnchor align)
        {
            var go = new GameObject("Label", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var text = go.AddComponent<Text>();
            text.font = Font;
            text.fontSize = size;
            text.fontStyle = style;
            text.color = color;
            text.alignment = align;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.supportRichText = false;
            text.text = value ?? "";
            text.raycastTarget = false;
            return text;
        }

        static RectTransform CreateStretch(Transform parent, string name)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            return rect;
        }

        static void Stretch(RectTransform rect, float left, float bottom, float right, float top)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = new Vector2(left, bottom);
            rect.offsetMax = new Vector2(-right, -top);
        }

        static Color32 ButtonColor(Btn kind)
        {
            switch (kind)
            {
                case Btn.Orange: return Orange;
                case Btn.Danger: return Danger;
                case Btn.Pass: return Pass;
                case Btn.Soft: return Soft;
                default: return Slate;
            }
        }

        static Color32 ButtonInk(Btn kind)
        {
            if (kind == Btn.Orange) return OrangeInk;
            if (kind == Btn.Soft) return Slate;
            return White;
        }

        static RectTransform TopBand(Transform parent, string name, float y, float h)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(1f, 1f);
            rect.pivot = new Vector2(0.5f, 1f);
            rect.offsetMin = new Vector2(0f, -(y + h));
            rect.offsetMax = new Vector2(0f, -y);
            return rect;
        }

        static RectTransform Pin(RectTransform parent, string name, float x, float y, float w, float h)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(0f, 1f);
            rect.pivot = new Vector2(0f, 1f);
            rect.anchoredPosition = new Vector2(x, -y);
            rect.sizeDelta = new Vector2(w, h);
            return rect;
        }

        static RectTransform PinRight(RectTransform parent, string name, float right, float w, float h)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(1f, 0.5f);
            rect.anchorMax = new Vector2(1f, 0.5f);
            rect.pivot = new Vector2(1f, 0.5f);
            rect.anchoredPosition = new Vector2(-right, 0f);
            rect.sizeDelta = new Vector2(w, h);
            return rect;
        }

        static Texture2D Rounded(int w, int h, int radius)
        {
            if (w < 2) w = 2;
            if (h < 2) h = 2;
            if (radius < 1) radius = 1;
            if (radius > w / 2) radius = w / 2;
            if (radius > h / 2) radius = h / 2;
            var key = w + "x" + h + "r" + radius;
            Texture2D cached;
            if (Textures.TryGetValue(key, out cached)) return cached;
            var pixels = new Color[w * h];
            var r = (float)radius;
            for (var y = 0; y < h; y++)
            {
                for (var x = 0; x < w; x++)
                {
                    var px = x + 0.5f;
                    var py = y + 0.5f;
                    var dx = 0f;
                    var dy = 0f;
                    if (px < r) dx = r - px;
                    else if (px > w - r) dx = px - (w - r);
                    if (py < r) dy = r - py;
                    else if (py > h - r) dy = py - (h - r);
                    var alpha = 1f;
                    if (dx != 0f || dy != 0f)
                    {
                        var dist = (float)Math.Sqrt(dx * dx + dy * dy);
                        if (dist >= r + 0.8f) alpha = 0f;
                        else if (dist > r - 0.8f) alpha = (r + 0.8f - dist) / 1.6f;
                    }
                    if (alpha < 0f) alpha = 0f;
                    if (alpha > 1f) alpha = 1f;
                    pixels[y * w + x] = new Color(1f, 1f, 1f, alpha);
                }
            }
            var tex = new Texture2D(w, h);
            tex.wrapMode = TextureWrapMode.Clamp;
            tex.filterMode = FilterMode.Bilinear;
            tex.SetPixels(pixels);
            tex.Apply();
            Textures[key] = tex;
            return tex;
        }

        static void DestroyNamed(string name)
        {
            var existing = GameObject.Find(name);
            if (existing != null) UnityEngine.Object.DestroyImmediate(existing);
        }
    }
}
