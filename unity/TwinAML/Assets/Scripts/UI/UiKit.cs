using System;
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
        Orange,
        Danger,
        Pass
    }

    public static class UiKit
    {
        public static readonly Color32 Bg = new Color32(0x12, 0x17, 0x1c, 0xff);
        public static readonly Color32 Header = new Color32(0x0d, 0x12, 0x16, 0xff);
        public static readonly Color32 Card = new Color32(0x1c, 0x25, 0x30, 0xff);
        public static readonly Color32 Ink = new Color32(0xe8, 0xee, 0xf4, 0xff);
        public static readonly Color32 Muted = new Color32(0x9a, 0xab, 0xbb, 0xff);
        public static readonly Color32 Orange = new Color32(0xf5, 0xa5, 0x24, 0xff);
        public static readonly Color32 OrangeInk = new Color32(0x1a, 0x12, 0x04, 0xff);
        public static readonly Color32 Danger = new Color32(0x8c, 0x32, 0x2e, 0xff);
        public static readonly Color32 Pass = new Color32(0x1f, 0x6b, 0x52, 0xff);
        public static readonly Color32 Slate = new Color32(0x2c, 0x3a, 0x4a, 0xff);
        public static readonly Color32 Slot = new Color32(0x0b, 0x0e, 0x12, 0xff);

        const float TextWidth = 860f;

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

            var header = CreateStretch(canvasGo.transform, "Header");
            header.anchorMin = new Vector2(0f, 1f);
            header.anchorMax = new Vector2(1f, 1f);
            header.pivot = new Vector2(0.5f, 1f);
            header.offsetMin = new Vector2(0f, -96f);
            header.offsetMax = new Vector2(0f, 0f);
            var headerImage = header.gameObject.AddComponent<Image>();
            headerImage.color = Header;
            PlaceText(header, Locale.T("banner"), 18, FontStyle.Bold, Orange, TextAnchor.UpperLeft, 28f, 18f, 520f, 28f);
            PlaceText(header, id.ToString(), 20, FontStyle.Bold, Ink, TextAnchor.UpperRight, 560f, 16f, 28f, 30f);
            PlaceText(header, "TwinAML", 28, FontStyle.Bold, Ink, TextAnchor.LowerLeft, 28f, 8f, 280f, 36f);
            var lang = PlaceButton(header, Locale.T("lang.switch"), Btn.Slate, () =>
            {
                FlowController.Instance.SetLocale(Locale.Current == LocaleCode.En ? LocaleCode.Zh : LocaleCode.En);
            });
            lang.anchorMin = new Vector2(1f, 0f);
            lang.anchorMax = new Vector2(1f, 0f);
            lang.pivot = new Vector2(1f, 0f);
            lang.anchoredPosition = new Vector2(-24f, 14f);
            lang.sizeDelta = new Vector2(180f, 36f);

            var footer = CreateStretch(canvasGo.transform, "Footer");
            footer.anchorMin = new Vector2(0f, 0f);
            footer.anchorMax = new Vector2(1f, 0f);
            footer.pivot = new Vector2(0.5f, 0f);
            footer.offsetMin = new Vector2(0f, 0f);
            footer.offsetMax = new Vector2(0f, 36f);
            PlaceText(footer, Locale.T("footer"), 16, FontStyle.Normal, Muted, TextAnchor.MiddleLeft, 28f, 4f, 28f, 28f);

            var scrollGo = new GameObject("Scroll", typeof(RectTransform));
            scrollGo.transform.SetParent(canvasGo.transform, false);
            var scrollRect = scrollGo.GetComponent<RectTransform>();
            scrollRect.anchorMin = Vector2.zero;
            scrollRect.anchorMax = Vector2.one;
            scrollRect.offsetMin = new Vector2(0f, 36f);
            scrollRect.offsetMax = new Vector2(0f, -96f);
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
            _content.anchorMin = new Vector2(0f, 1f);
            _content.anchorMax = new Vector2(1f, 1f);
            _content.pivot = new Vector2(0.5f, 1f);
            _content.anchoredPosition = Vector2.zero;
            _content.sizeDelta = new Vector2(0f, 400f);
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
            _content.sizeDelta = new Vector2(0f, _y + 28f);
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
            var image = imageGo.AddComponent<Image>();
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
            var image = rect.gameObject.AddComponent<Image>();
            image.color = ButtonColor(kind);
            var button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            var colors = button.colors;
            colors.fadeDuration = 0.05f;
            button.colors = colors;
            if (onClick != null) button.onClick.AddListener(() => onClick());
            var text = CreateText(rect, label, 20, FontStyle.Bold, ButtonInk(kind), TextAnchor.MiddleCenter);
            Stretch(text.rectTransform, 16f, 8f, 16f, 8f);
        }

        public static void ButtonRow(string left, Btn leftKind, Action onLeft, string right, Btn rightKind, Action onRight)
        {
            var height = Mathf.Max(64f, Mathf.Max(Estimate(left, 20), Estimate(right, 20)) + 20f);
            var row = AddBlock("Row", height);
            var leftRect = ChildHalf(row, true);
            var rightRect = ChildHalf(row, false);
            PaintButton(leftRect, left, leftKind, onLeft);
            PaintButton(rightRect, right, rightKind, onRight);
        }

        public static void Input(string value, string placeholder, Action<string> onChange)
        {
            var rect = AddBlock("Input", 52f);
            var image = rect.gameObject.AddComponent<Image>();
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

        static void PaintButton(RectTransform rect, string label, Btn kind, Action onClick)
        {
            var image = rect.gameObject.AddComponent<Image>();
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

        static RectTransform PlaceButton(RectTransform parent, string label, Btn kind, Action onClick)
        {
            var go = new GameObject("HeaderButton", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            PaintButton(rect, label, kind, onClick);
            return rect;
        }

        static void PlaceText(RectTransform parent, string value, int size, FontStyle style, Color32 color, TextAnchor align, float left, float bottom, float right, float height)
        {
            var text = CreateText(parent, value, size, style, color, align);
            var rect = text.rectTransform;
            rect.anchorMin = new Vector2(0f, 0f);
            rect.anchorMax = new Vector2(1f, 1f);
            rect.offsetMin = new Vector2(left, bottom);
            rect.offsetMax = new Vector2(-right, -8f);
            if (align == TextAnchor.UpperLeft || align == TextAnchor.UpperRight)
            {
                rect.anchorMin = new Vector2(0f, 1f);
                rect.anchorMax = new Vector2(1f, 1f);
                rect.pivot = new Vector2(0.5f, 1f);
                rect.offsetMin = new Vector2(left, -18f - height);
                rect.offsetMax = new Vector2(-right, -14f);
            }
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
                default: return Slate;
            }
        }

        static Color32 ButtonInk(Btn kind)
        {
            return kind == Btn.Orange ? OrangeInk : Ink;
        }

        static void DestroyNamed(string name)
        {
            var existing = GameObject.Find(name);
            if (existing != null) UnityEngine.Object.DestroyImmediate(existing);
        }
    }
}
