using System;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace TwinAml
{
    /// <summary>
    /// Light corporate portal for Scn_Dashboard. Exercise scenes keep the dark UiKit shell.
    /// Progress is completed catalogue modules divided by six. Empty stays 0%.
    /// </summary>
    public static class PortalDashboard
    {
        const float PageW = 1920f;
        const float Margin = 28f;
        const float Gap = 18f;
        const float LeftW = 520f;
        const float CenterW = 752f;
        const float RightW = 556f;
        const int Catalogue = 6;

        static readonly Color32 Page = new Color32(0xee, 0xf2, 0xf6, 0xff);
        static readonly Color32 Navy = new Color32(0x0d, 0x21, 0x37, 0xff);
        static readonly Color32 Blue = new Color32(0x2f, 0x6f, 0xed, 0xff);
        static readonly Color32 Ink = new Color32(0x1a, 0x24, 0x32, 0xff);
        static readonly Color32 Muted = new Color32(0x5c, 0x6b, 0x7a, 0xff);
        static readonly Color32 Green = new Color32(0x1f, 0x8a, 0x5b, 0xff);
        static readonly Color32 Amber = new Color32(0xe0, 0xa1, 0x00, 0xff);
        static readonly Color32 Gray = new Color32(0x8b, 0x97, 0xa6, 0xff);
        static readonly Color32 Track = new Color32(0xe6, 0xeb, 0xf1, 0xff);
        static readonly Color32 Line = new Color32(0xd5, 0xde, 0xe8, 0xff);
        static readonly Color32 Chip = new Color32(0x1b, 0x3a, 0x56, 0xff);
        static readonly Color32 SoftBlue = new Color32(0xe7, 0xef, 0xfc, 0xff);
        static readonly Color32 NoticeBg = new Color32(0xff, 0xf6, 0xe8, 0xff);
        static readonly Color32 Orange = new Color32(0xf5, 0xa5, 0x24, 0xff);
        static readonly Color32 OrangeInk = new Color32(0x1a, 0x12, 0x04, 0xff);

        static readonly Dictionary<string, Texture2D> Textures = new Dictionary<string, Texture2D>();
        static Texture2D _gear;
        static Texture2D _bell;

        public static void Build()
        {
            var flow = FlowController.Instance;
            DestroyNamed("TwinAML.UI");
            DestroyNamed("TwinAML.EventSystem");
            if (flow == null) return;

            var canvasGo = new GameObject("TwinAML.UI");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(PageW, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
            canvasGo.AddComponent<GraphicRaycaster>();

            var bg = Stretch(canvasGo.transform, "Background");
            var bgImage = bg.gameObject.AddComponent<Image>();
            bgImage.color = Page;
            bgImage.raycastTarget = false;

            BuildHeader(canvasGo.transform, flow);
            BuildTabs(canvasGo.transform, flow);
            var strip = TopBand(canvasGo.transform, "Disclaimer", 120f, 32f);
            var stripImage = strip.gameObject.AddComponent<Image>();
            stripImage.color = new Color32(0xe4, 0xeb, 0xf2, 0xff);
            stripImage.raycastTarget = false;
            Put(strip, Locale.T("portal.disclaimer"), 14, FontStyle.Normal, Muted, TextAnchor.MiddleLeft, 28f, 4f, PageW - 56f, 24f);

            var scrollGo = new GameObject("Scroll", typeof(RectTransform));
            scrollGo.transform.SetParent(canvasGo.transform, false);
            var scrollRect = scrollGo.GetComponent<RectTransform>();
            scrollRect.anchorMin = Vector2.zero;
            scrollRect.anchorMax = Vector2.one;
            scrollRect.offsetMin = Vector2.zero;
            scrollRect.offsetMax = new Vector2(0f, -152f);
            var scroll = scrollGo.AddComponent<ScrollRect>();
            scroll.horizontal = false;
            scroll.vertical = true;
            scroll.movementType = ScrollRect.MovementType.Clamped;
            scroll.scrollSensitivity = 32f;

            var viewport = Stretch(scrollGo.transform, "Viewport");
            viewport.gameObject.AddComponent<RectMask2D>();
            var viewportImage = viewport.gameObject.AddComponent<Image>();
            viewportImage.color = new Color(1f, 1f, 1f, 0.01f);
            scroll.viewport = viewport;

            var contentGo = new GameObject("Content", typeof(RectTransform));
            contentGo.transform.SetParent(viewport, false);
            var content = contentGo.GetComponent<RectTransform>();
            content.anchorMin = new Vector2(0f, 1f);
            content.anchorMax = new Vector2(1f, 1f);
            content.pivot = new Vector2(0.5f, 1f);
            content.anchoredPosition = Vector2.zero;
            scroll.content = content;

            var events = new GameObject("TwinAML.EventSystem");
            events.AddComponent<EventSystem>();
            events.AddComponent<StandaloneInputModule>();

            var height = BuildBody(content, flow);
            content.sizeDelta = new Vector2(0f, height);
        }

        static void BuildHeader(Transform canvas, FlowController flow)
        {
            var header = TopBand(canvas, "Header", 0f, 72f);
            var image = header.gameObject.AddComponent<Image>();
            image.color = Navy;
            image.raycastTarget = false;

            var mark = Box(header, "Mark", 24f, 16f, 40f, 40f);
            var markImage = mark.gameObject.AddComponent<RawImage>();
            markImage.texture = Rounded(40, 40, 10);
            markImage.color = Blue;
            markImage.raycastTarget = false;
            Put(mark, "T", 22, FontStyle.Bold, Color.white, TextAnchor.MiddleCenter, 0f, 0f, 40f, 40f);

            Put(header, Locale.T("portal.title"), 22, FontStyle.Bold, Color.white, TextAnchor.MiddleLeft, 76f, 16f, 1200f, 40f);

            var name = flow.Trainee;
            if (string.IsNullOrEmpty(name)) name = Locale.Current == LocaleCode.Zh ? "學員" : "Trainee";
            var chip = Box(header, "User", 1576f, 16f, 320f, 40f);
            var chipImage = chip.gameObject.AddComponent<RawImage>();
            chipImage.texture = Rounded(320, 40, 20);
            chipImage.color = Chip;
            chipImage.raycastTarget = false;
            Put(chip, name + "  ·  " + Locale.T("portal.role"), 15, FontStyle.Normal, Color.white, TextAnchor.MiddleCenter, 12f, 4f, 296f, 32f);

            IconButton(header, "Bell", BellIcon(), 1524f, 16f, 40f, flow.BellOpen ? Blue : Chip, () =>
            {
                flow.BellOpen = !flow.BellOpen;
                flow.Go(SceneId.Scn_Dashboard);
            });
            IconButton(header, "Settings", GearIcon(), 1474f, 16f, 40f, Chip, () => flow.Go(SceneId.Scn_Settings));
            Click(header, "Lang", Locale.T("portal.lang"), Chip, Color.white, 1390f, 16f, 72f, 40f, () =>
            {
                Locale.Current = Locale.Current == LocaleCode.En ? LocaleCode.Zh : LocaleCode.En;
                flow.Go(SceneId.Scn_Dashboard);
            });
        }

        static void BuildTabs(Transform canvas, FlowController flow)
        {
            var bar = TopBand(canvas, "Tabs", 72f, 48f);
            var image = bar.gameObject.AddComponent<Image>();
            image.color = Color.white;
            image.raycastTarget = false;
            var hairline = Box(bar, "Hairline", 0f, 47f, PageW, 1f);
            var line = hairline.gameObject.AddComponent<Image>();
            line.color = Line;
            line.raycastTarget = false;

            string[] keys = { "portal.tab.dash", "portal.tab.training", "portal.tab.reports", "portal.tab.help" };
            for (var i = 0; i < keys.Length; i++)
            {
                var index = i;
                var on = flow.PortalPage == index;
                var tab = Box(bar, "Tab", 12f + index * 188f, 0f, 180f, 48f);
                var hit = tab.gameObject.AddComponent<Image>();
                hit.color = new Color(1f, 1f, 1f, 0f);
                var button = tab.gameObject.AddComponent<Button>();
                button.targetGraphic = hit;
                button.onClick.AddListener(() =>
                {
                    flow.PortalPage = index;
                    flow.Go(SceneId.Scn_Dashboard);
                });
                Put(tab, Locale.T(keys[index]), 16, on ? FontStyle.Bold : FontStyle.Normal, on ? Blue : Muted, TextAnchor.MiddleCenter, 8f, 6f, 164f, 34f);
                if (!on) continue;
                var underline = Box(tab, "Underline", 28f, 43f, 124f, 3f);
                var barImage = underline.gameObject.AddComponent<Image>();
                barImage.color = Blue;
                barImage.raycastTarget = false;
            }
        }

        static float BuildBody(RectTransform content, FlowController flow)
        {
            var y = 20f;
            var heading = flow.PortalPage == 1 ? Locale.T("portal.tab.training")
                : flow.PortalPage == 2 ? Locale.T("portal.tab.reports")
                : flow.PortalPage == 3 ? Locale.T("portal.tab.help")
                : Locale.T("portal.heading");
            Put(content, heading, 30, FontStyle.Bold, Ink, TextAnchor.MiddleLeft, Margin, y, 1200f, 40f);
            y += 52f;

            if (!string.IsNullOrEmpty(flow.PortalNotice))
            {
                var noticeH = 72f;
                var notice = Card(content, "Notice", Margin, y, PageW - Margin * 2f, noticeH, NoticeBg);
                Put(notice, flow.PortalNotice, 15, FontStyle.Normal, Ink, TextAnchor.UpperLeft, 18f, 14f, PageW - Margin * 2f - 150f, 46f);
                Click(notice, "Dismiss", Locale.T("portal.dismiss"), SoftBlue, Blue, PageW - Margin * 2f - 132f, 18f, 110f, 36f, () =>
                {
                    flow.PortalNotice = "";
                    flow.Go(SceneId.Scn_Dashboard);
                });
                y += noticeH + Gap;
            }

            if (flow.BellOpen)
            {
                var bellH = 96f;
                var bell = Card(content, "BellCard", Margin, y, PageW - Margin * 2f, bellH, Color.white);
                Put(bell, Locale.T("portal.bell"), 16, FontStyle.Bold, Ink, TextAnchor.UpperLeft, 18f, 14f, 400f, 24f);
                Put(bell, Locale.T("portal.bell.body"), 15, FontStyle.Normal, Muted, TextAnchor.UpperLeft, 18f, 42f, PageW - Margin * 2f - 40f, 40f);
                y += bellH + Gap;
            }

            if (flow.PortalPage == 1) return Training(content, flow, y);
            if (flow.PortalPage == 2) return Reports(content, flow, y);
            if (flow.PortalPage == 3) return Help(content, flow, y);
            return Overview(content, flow, y);
        }

        static float Overview(RectTransform content, FlowController flow, float y)
        {
            y = Metrics(content, flow, y);
            var left = LeftColumn(content, flow, Margin, y);
            var center = CenterColumn(content, flow, Margin + LeftW + Gap, y);
            var right = RightColumn(content, flow, Margin + LeftW + Gap + CenterW + Gap, y);
            return Math.Max(left, Math.Max(center, right)) + 24f;
        }

        static float LeftColumn(RectTransform content, FlowController flow, float x, float y)
        {
            int done;
            int progressing;
            int remaining;
            int percent;
            Counts(flow, out done, out progressing, out remaining, out percent);

            var progressH = 496f;
            var card = Card(content, "Progress", x, y, LeftW, progressH, Color.white);
            Put(card, Locale.T("portal.progress"), 18, FontStyle.Bold, Ink, TextAnchor.UpperLeft, 20f, 16f, LeftW - 40f, 48f);

            var donut = Box(card, "Donut", (LeftW - 176f) / 2f, 74f, 176f, 176f);
            var donutImage = donut.gameObject.AddComponent<RawImage>();
            donutImage.texture = Donut(percent);
            donutImage.color = Color.white;
            donutImage.raycastTarget = false;
            Put(donut, percent + "%", 32, FontStyle.Bold, Ink, TextAnchor.MiddleCenter, 38f, 58f, 100f, 40f);
            Put(donut, done + " / " + Catalogue, 14, FontStyle.Normal, Muted, TextAnchor.MiddleCenter, 38f, 96f, 100f, 22f);

            Legend(card, 268f, Navy, Locale.T("portal.total"), Catalogue.ToString());
            Legend(card, 300f, Green, Locale.T("portal.completed"), done.ToString());
            Legend(card, 332f, Amber, Locale.T("portal.progressing"), progressing.ToString());
            Legend(card, 364f, Gray, Locale.T("portal.remaining"), remaining.ToString());

            Put(card, Locale.T("portal.mix"), 13, FontStyle.Bold, Muted, TextAnchor.UpperLeft, 20f, 402f, 200f, 18f);
            Bar(card, 424f, Navy, Catalogue);
            Bar(card, 440f, Green, done);
            Bar(card, 456f, Amber, progressing);
            Bar(card, 472f, Gray, remaining);

            var shown = Math.Min(4, flow.Completed.Count);
            var activityH = shown == 0 ? 118f : 56f + shown * 52f;
            var activity = Card(content, "Activity", x, y + progressH + Gap, LeftW, activityH, Color.white);
            Put(activity, Locale.T("portal.activity"), 16, FontStyle.Bold, Ink, TextAnchor.UpperLeft, 18f, 14f, LeftW - 36f, 24f);
            if (shown == 0)
            {
                Put(activity, Locale.T("portal.activity.empty"), 14, FontStyle.Normal, Muted, TextAnchor.UpperLeft, 18f, 48f, LeftW - 36f, 48f);
            }
            else
            {
                var row = 0;
                for (var i = flow.Completed.Count - 1; i >= 0 && row < 4; i--)
                {
                    var session = flow.Completed[i];
                    var when = session.LastChoice != null ? When(session.LastChoice.ChosenUnixMs) : "";
                    var badge = Locale.T(session.Trap ? "portal.badge.trap" : "portal.badge.pass");
                    var line = Locale.T("portal.done") + "  ·  " + TopicName(session.Topic) + "\n" + badge + "  ·  " + when;
                    Put(activity, line, 14, FontStyle.Normal, Ink, TextAnchor.UpperLeft, 18f, 46f + row * 52f, LeftW - 36f, 48f);
                    row++;
                }
            }
            return y + progressH + Gap + activityH;
        }

        static float CenterColumn(RectTransform content, FlowController flow, float x, float y)
        {
            Put(content, Locale.T("portal.courses"), 18, FontStyle.Bold, Ink, TextAnchor.MiddleLeft, x, y, CenterW, 28f);
            var top = y + 40f;
            var cardW = (CenterW - 16f) / 2f;
            var cardH = 236f;
            for (var i = 0; i < 5; i++)
            {
                var col = i % 2;
                var row = i / 2;
                PaintCourse(content, flow, i, x + col * (cardW + 16f), top + row * (cardH + 16f), cardW, cardH);
            }
            return top + 3f * cardH + 2f * 16f;
        }

        static float RightColumn(RectTransform content, FlowController flow, float x, float y)
        {
            var featuredH = 268f;
            PaintCourse(content, flow, 5, x, y, RightW, featuredH);

            var recH = 210f;
            var rec = Card(content, "Recommended", x, y + featuredH + Gap, RightW, recH, Color.white);
            Put(rec, Locale.T("portal.recommended"), 16, FontStyle.Bold, Ink, TextAnchor.UpperLeft, 18f, 14f, RightW - 36f, 24f);
            Put(rec, "1   " + Locale.T("portal.rec1"), 14, FontStyle.Normal, Ink, TextAnchor.UpperLeft, 18f, 48f, RightW - 36f, 44f);
            Put(rec, "2   " + Locale.T("portal.rec2"), 14, FontStyle.Normal, Ink, TextAnchor.UpperLeft, 18f, 96f, RightW - 36f, 44f);
            Put(rec, "3   " + Locale.T("portal.rec3"), 14, FontStyle.Normal, Ink, TextAnchor.UpperLeft, 18f, 144f, RightW - 36f, 52f);

            var quickH = 196f;
            var quick = Card(content, "Quick", x, y + featuredH + Gap + recH + Gap, RightW, quickH, Color.white);
            Put(quick, Locale.T("portal.quick"), 16, FontStyle.Bold, Ink, TextAnchor.UpperLeft, 18f, 14f, RightW - 36f, 24f);
            QuickLink(quick, flow, Locale.T("portal.policy"), 48f, RightW);
            QuickLink(quick, flow, Locale.T("portal.news"), 96f, RightW);
            QuickLink(quick, flow, Locale.T("portal.contact"), 144f, RightW);
            return y + featuredH + Gap + recH + Gap + quickH;
        }

        static void QuickLink(RectTransform parent, FlowController flow, string label, float y, float width)
        {
            Click(parent, "Link", label, SoftBlue, Blue, 16f, y, width - 32f, 40f, () =>
            {
                flow.PortalNotice = Locale.T("portal.stub");
                flow.Go(SceneId.Scn_Dashboard);
            });
        }

        static float Training(RectTransform content, FlowController flow, float y)
        {
            var lead = Locale.T("portal.training.lead");
            var leadH = Estimate(lead, 16, PageW - Margin * 2f);
            Put(content, lead, 16, FontStyle.Normal, Muted, TextAnchor.UpperLeft, Margin, y, PageW - Margin * 2f, leadH);
            y += leadH + 12f;
            var cardW = 608f;
            var cardH = 220f;
            for (var i = 0; i < 6; i++)
            {
                var col = i % 3;
                var row = i / 3;
                PaintCourse(content, flow, i, Margin + col * (cardW + 16f), y + row * (cardH + 16f), cardW, cardH);
            }
            return y + 2f * cardH + 16f + 28f;
        }

        static float Reports(RectTransform content, FlowController flow, float y)
        {
            var lead = Locale.T("portal.reports.lead");
            var leadH = Estimate(lead, 16, PageW - Margin * 2f);
            Put(content, lead, 16, FontStyle.Normal, Muted, TextAnchor.UpperLeft, Margin, y, PageW - Margin * 2f, leadH);
            y += leadH + 12f;
            y = Metrics(content, flow, y);
            if (flow.Session != null && !flow.Session.Completed)
            {
                var openText = Locale.T("dash.open") + "\n" + flow.Session.Topic + "  ·  " + flow.Session.CaseId;
                var openH = Estimate(openText, 15, PageW - Margin * 2f - 36f) + 28f;
                var open = Card(content, "Open", Margin, y, PageW - Margin * 2f, openH, Color.white);
                Put(open, openText, 15, FontStyle.Normal, Ink, TextAnchor.UpperLeft, 18f, 14f, PageW - Margin * 2f - 36f, openH - 24f);
                y += openH + Gap;
            }
            if (flow.Completed.Count == 0) return y + 12f;
            for (var i = flow.Completed.Count - 1; i >= 0; i--)
            {
                var text = SessionText(flow.Completed[i]);
                var h = Estimate(text, 15, PageW - Margin * 2f - 36f) + 28f;
                var card = Card(content, "Session", Margin, y, PageW - Margin * 2f, h, Color.white);
                Put(card, text, 15, FontStyle.Normal, Ink, TextAnchor.UpperLeft, 18f, 14f, PageW - Margin * 2f - 36f, h - 24f);
                y += h + Gap;
            }
            return y + 12f;
        }

        static float Help(RectTransform content, FlowController flow, float y)
        {
            var body = Locale.T("portal.help.body");
            var h = Estimate(body, 16, PageW - Margin * 2f - 40f) + 36f;
            var card = Card(content, "Help", Margin, y, PageW - Margin * 2f, h, Color.white);
            Put(card, body, 16, FontStyle.Normal, Ink, TextAnchor.UpperLeft, 20f, 16f, PageW - Margin * 2f - 40f, h - 28f);
            y += h + Gap;
            var note = Locale.T("portal.disclaimer");
            var noteH = 64f;
            var noteCard = Card(content, "HelpNote", Margin, y, PageW - Margin * 2f, noteH, Color.white);
            Put(noteCard, note, 15, FontStyle.Normal, Muted, TextAnchor.MiddleLeft, 20f, 12f, PageW - Margin * 2f - 40f, 40f);
            return y + noteH + 28f;
        }

        static float Metrics(RectTransform content, FlowController flow, float y)
        {
            var empty = flow.Completed.Count == 0;
            var w = PageW - Margin * 2f;
            var h = empty ? 176f : 136f;
            var card = Card(content, "Metrics", Margin, y, w, h, Color.white);
            string rate;
            string reaction;
            string funds;
            string called;
            string dual;
            string str;
            var caption = Locale.T("dash.file") + "  " + DashboardStore.FilePath;
            if (empty)
            {
                var dash = Locale.T("none");
                rate = reaction = funds = called = dual = str = dash;
            }
            else
            {
                var traps = flow.TrapCount();
                var count = flow.Completed.Count;
                var latest = flow.Completed[count - 1];
                rate = traps + " / " + count + "    " + (traps * 100 / count) + "%";
                reaction = flow.MeanReactionMs() + " ms";
                funds = YesNo(latest.FundsRisk);
                called = YesNo(latest.CalledBack);
                dual = YesNo(latest.DualApproval);
                str = YesNo(latest.StrFiled);
                caption = Locale.T("dash.latest") + "  ·  " + TopicName(latest.Topic) + "    " + caption;
            }
            string[] labels =
            {
                Locale.T("dash.rate"),
                Locale.T("dash.reaction"),
                Locale.T("field.funds"),
                Locale.T("field.callback"),
                Locale.T("field.dual"),
                Locale.T("field.str")
            };
            string[] values = { rate, reaction, funds, called, dual, str };
            var cell = w / 6f;
            for (var i = 0; i < 6; i++)
            {
                if (i > 0)
                {
                    var hair = Box(card, "Sep", i * cell, 16f, 1f, 72f);
                    var hairImage = hair.gameObject.AddComponent<Image>();
                    hairImage.color = Line;
                    hairImage.raycastTarget = false;
                }
                Put(card, labels[i], 13, FontStyle.Normal, Muted, TextAnchor.UpperLeft, i * cell + 14f, 14f, cell - 24f, 36f);
                Put(card, values[i], 20, FontStyle.Bold, Ink, TextAnchor.UpperLeft, i * cell + 14f, 50f, cell - 24f, 32f);
            }
            if (empty)
                Put(card, Locale.T("dash.empty"), 13, FontStyle.Normal, Muted, TextAnchor.UpperLeft, 16f, 92f, w - 32f, 40f);
            Put(card, caption, 13, FontStyle.Normal, Muted, TextAnchor.MiddleLeft, 16f, h - 32f, w - 32f, 22f);
            return y + h + Gap;
        }

        static void PaintCourse(Transform parent, FlowController flow, int index, float x, float y, float w, float h)
        {
            string kicker;
            string title;
            string body;
            string status;
            var statusColor = Gray;
            string button = null;
            var buttonBg = Blue;
            var buttonInk = new Color32(0xff, 0xff, 0xff, 0xff);
            Action onClick = null;
            var extra = "";
            var passedT02 = TopicPassed(flow, "T02");

            if (index == 0 || index == 1)
            {
                var topic = index == 0 ? "T01" : "T02";
                var state = Playable(flow, topic);
                var latest = Latest(flow, topic);
                kicker = Locale.T(index == 0 ? "portal.t01.kicker" : "portal.t02.kicker");
                title = Locale.T(index == 0 ? "portal.t01.title" : "portal.t02.title");
                body = Locale.T(index == 0 ? "portal.t01.body" : "portal.t02.body");
                if (latest != null && latest.LastChoice != null)
                    extra = Locale.T("portal.score") + "  " + ScoreOf(latest) + "  ·  " + When(latest.LastChoice.ChosenUnixMs);
                if (state == 2)
                {
                    status = Locale.T("portal.completed");
                    statusColor = Green;
                    button = Locale.T("portal.review");
                }
                else
                {
                    status = Locale.T(state == 1 ? "portal.progressing" : "portal.notStarted");
                    if (state == 1) statusColor = Amber;
                    button = Locale.T(index == 0 ? "portal.continue" : "portal.start");
                    if (index == 1)
                    {
                        buttonBg = Orange;
                        buttonInk = OrangeInk;
                    }
                }
                onClick = () =>
                {
                    flow.StartTopic(topic);
                    flow.Go(index == 0 ? SceneId.Scn_T01_Brief : SceneId.Scn_T02_Brief);
                };
            }
            else if (index == 2)
            {
                kicker = Locale.T("portal.notStarted");
                title = Locale.T("portal.mod.tbml");
                body = Locale.T("portal.mod.tbml.body");
                status = Locale.T("portal.notStarted");
            }
            else if (index == 3)
            {
                kicker = passedT02 ? Locale.T("portal.notStarted") : Locale.T("portal.locked");
                title = Locale.T("portal.mod.rent");
                body = Locale.T("portal.mod.rent.body");
                status = Locale.T(passedT02 ? "portal.notStarted" : "portal.locked");
                if (!passedT02) extra = Locale.T("portal.prereq");
            }
            else if (index == 4)
            {
                kicker = Locale.T("portal.notStarted");
                title = Locale.T("portal.mod.controls");
                body = Locale.T("portal.mod.tbml.body");
                status = Locale.T("portal.notStarted");
            }
            else
            {
                kicker = Locale.T("portal.featured.kicker");
                title = Locale.T("portal.featured.title");
                body = Locale.T("portal.featured.body");
                status = Locale.T(passedT02 ? "portal.notStarted" : "portal.locked");
                if (!passedT02) extra = Locale.T("portal.prereq");
            }

            var card = Card(parent, "Course", x, y, w, h, Color.white);
            Put(card, kicker, 12, FontStyle.Bold, index == 5 ? Blue : Muted, TextAnchor.UpperLeft, 16f, 14f, w - 32f, 18f);
            Put(card, title, 18, FontStyle.Bold, Ink, TextAnchor.UpperLeft, 16f, 36f, w - 32f, 48f);
            Put(card, body, 14, FontStyle.Normal, Muted, TextAnchor.UpperLeft, 16f, 88f, w - 32f, 56f);
            if (!string.IsNullOrEmpty(extra))
                Put(card, extra, 13, FontStyle.Normal, Ink, TextAnchor.UpperLeft, 16f, 146f, w - 32f, 22f);
            Put(card, status, 14, FontStyle.Bold, statusColor, TextAnchor.MiddleLeft, 16f, h - 48f, onClick != null ? w - 160f : w - 32f, 32f);
            if (onClick != null)
                Click(card, "Cta", button, buttonBg, buttonInk, w - 136f, h - 52f, 116f, 36f, onClick);
        }

        static void Legend(RectTransform card, float y, Color32 color, string label, string value)
        {
            var dot = Box(card, "Dot", 22f, y + 6f, 10f, 10f);
            var image = dot.gameObject.AddComponent<RawImage>();
            image.texture = Rounded(10, 10, 5);
            image.color = color;
            image.raycastTarget = false;
            Put(card, label, 15, FontStyle.Normal, Ink, TextAnchor.MiddleLeft, 42f, y, 320f, 24f);
            Put(card, value, 15, FontStyle.Bold, Ink, TextAnchor.MiddleRight, LeftW - 80f, y, 52f, 24f);
        }

        static void Bar(RectTransform card, float y, Color32 color, int count)
        {
            var track = Box(card, "Track", 20f, y, LeftW - 40f, 8f);
            var trackImage = track.gameObject.AddComponent<RawImage>();
            trackImage.texture = Rounded((int)(LeftW - 40f), 8, 4);
            trackImage.color = Track;
            trackImage.raycastTarget = false;
            if (count <= 0) return;
            var width = Math.Max(8f, (LeftW - 40f) * count / Catalogue);
            var fill = Box(card, "Fill", 20f, y, width, 8f);
            var fillImage = fill.gameObject.AddComponent<RawImage>();
            fillImage.texture = Rounded((int)width, 8, 4);
            fillImage.color = color;
            fillImage.raycastTarget = false;
        }

        static string SessionText(TwinSession session)
        {
            var builder = new StringBuilder();
            builder.Append(TopicName(session.Topic)).Append("  ·  ").Append(session.CaseId);
            builder.Append('\n').Append(Locale.T("field.disposition")).Append(": ").Append(Show(session.Disposition));
            builder.Append('\n').Append(Locale.T("field.phase")).Append(": ").Append(Show(session.Phase));
            builder.Append('\n').Append(Locale.T("field.kyc")).Append(": ").Append(Show(session.KycStatus));
            builder.Append('\n').Append(Locale.T("field.score")).Append(": ").Append(session.RiskScore);
            builder.Append('\n').Append(Locale.T("field.flags")).Append(": ");
            builder.Append(session.Flags.Count == 0 ? Locale.T("none") : string.Join(", ", session.Flags.ToArray()));
            builder.Append('\n').Append(Locale.T("field.funds")).Append(": ").Append(YesNo(session.FundsRisk));
            builder.Append('\n').Append(Locale.T("field.callback")).Append(": ").Append(YesNo(session.CalledBack));
            builder.Append('\n').Append(Locale.T("field.dual")).Append(": ").Append(YesNo(session.DualApproval));
            builder.Append('\n').Append(Locale.T("field.str")).Append(": ").Append(YesNo(session.StrFiled));
            var last = session.LastChoice;
            if (last != null)
            {
                builder.Append('\n').Append(Locale.T("field.choice")).Append(": ").Append(last.ChoiceId);
                builder.Append("  (").Append(string.Join(" → ", last.ScriptChoiceIds.ToArray())).Append(")");
                builder.Append('\n').Append(Locale.T("field.reaction")).Append(": ").Append(last.ReactionMs).Append(" ms");
                builder.Append('\n').Append(Locale.T("portal.score")).Append(": ").Append(ScoreOf(session));
                builder.Append("  ·  ").Append(When(last.ChosenUnixMs));
            }
            if (!string.IsNullOrEmpty(session.MappingNote))
                builder.Append('\n').Append(session.MappingNote);
            return builder.ToString();
        }

        static void Counts(FlowController flow, out int done, out int progressing, out int remaining, out int percent)
        {
            done = 0;
            progressing = 0;
            Mark(flow, "T01", ref done, ref progressing);
            Mark(flow, "T02", ref done, ref progressing);
            remaining = Catalogue - done - progressing;
            percent = done * 100 / Catalogue;
        }

        static void Mark(FlowController flow, string topic, ref int done, ref int progressing)
        {
            var state = Playable(flow, topic);
            if (state == 2) done++;
            else if (state == 1) progressing++;
        }

        static int Playable(FlowController flow, string topic)
        {
            if (flow.Session != null && !flow.Session.Completed && flow.Session.Topic == topic) return 1;
            var latest = Latest(flow, topic);
            if (latest == null) return 0;
            return latest.Trap ? 1 : 2;
        }

        static bool TopicPassed(FlowController flow, string topic)
        {
            for (var i = 0; i < flow.Completed.Count; i++)
            {
                if (flow.Completed[i].Topic == topic && !flow.Completed[i].Trap) return true;
            }
            return false;
        }

        static TwinSession Latest(FlowController flow, string topic)
        {
            TwinSession found = null;
            for (var i = 0; i < flow.Completed.Count; i++)
            {
                if (flow.Completed[i].Topic == topic) found = flow.Completed[i];
            }
            return found;
        }

        static int ScoreOf(TwinSession session)
        {
            return session.Trap ? 40 : 100;
        }

        static string TopicName(string topic)
        {
            if (topic == "T01") return Locale.T("portal.t01.title");
            if (topic == "T02") return Locale.T("portal.t02.title");
            return topic ?? "";
        }

        static string When(long unixMs)
        {
            if (unixMs <= 0) return "";
            var epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            return epoch.AddMilliseconds(unixMs).ToString("yyyy-MM-dd");
        }

        static string YesNo(bool value)
        {
            return Locale.T(value ? "yes" : "no");
        }

        static string Show(string value)
        {
            return string.IsNullOrEmpty(value) ? Locale.T("none") : value;
        }

        static RectTransform Card(Transform parent, string name, float x, float y, float w, float h, Color32 color)
        {
            var rect = Box(parent, name, x, y, w, h);
            var image = rect.gameObject.AddComponent<RawImage>();
            image.texture = Rounded(Math.Max(4, (int)Math.Round(w)), Math.Max(4, (int)Math.Round(h)), 16);
            image.color = color;
            image.raycastTarget = false;
            return rect;
        }

        static void Click(Transform parent, string name, string label, Color32 bg, Color32 ink, float x, float y, float w, float h, Action onClick)
        {
            var rect = Box(parent, name, x, y, w, h);
            var image = rect.gameObject.AddComponent<RawImage>();
            image.texture = Rounded(Math.Max(4, (int)Math.Round(w)), Math.Max(4, (int)Math.Round(h)), 8);
            image.color = bg;
            var button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            if (onClick != null) button.onClick.AddListener(() => onClick());
            Put(rect, label, 14, FontStyle.Bold, ink, TextAnchor.MiddleCenter, 6f, 2f, w - 12f, h - 4f);
        }

        static void IconButton(Transform parent, string name, Texture2D icon, float x, float y, float size, Color32 bg, Action onClick)
        {
            var rect = Box(parent, name, x, y, size, size);
            var image = rect.gameObject.AddComponent<RawImage>();
            image.texture = Rounded((int)size, (int)size, (int)(size / 2f));
            image.color = bg;
            var button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            if (onClick != null) button.onClick.AddListener(() => onClick());
            var glyph = Box(rect, "Glyph", size * 0.22f, size * 0.22f, size * 0.56f, size * 0.56f);
            var raw = glyph.gameObject.AddComponent<RawImage>();
            raw.texture = icon;
            raw.color = Color.white;
            raw.raycastTarget = false;
        }

        static Text Put(Transform parent, string value, int size, FontStyle style, Color32 color, TextAnchor align, float x, float y, float w, float h)
        {
            var rect = Box(parent, "Label", x, y, w, h);
            var text = rect.gameObject.AddComponent<Text>();
            text.font = UiKit.Font;
            text.fontSize = size;
            text.fontStyle = style;
            text.color = color;
            text.alignment = align;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.supportRichText = false;
            text.raycastTarget = false;
            text.text = value ?? "";
            return text;
        }

        static RectTransform Box(Transform parent, string name, float x, float y, float w, float h)
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

        static RectTransform Stretch(Transform parent, string name)
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

        static float Estimate(string text, int size, float width)
        {
            if (string.IsNullOrEmpty(text)) return size + 8f;
            var lines = 1;
            var used = 0f;
            for (var i = 0; i < text.Length; i++)
            {
                var c = text[i];
                if (c == '\n')
                {
                    lines++;
                    used = 0f;
                    continue;
                }
                var advance = c <= 127 ? size * 0.56f : size * 1.02f;
                if (used + advance > width && used > 0f)
                {
                    lines++;
                    used = advance;
                }
                else used += advance;
            }
            return lines * (size + 8f) + 6f;
        }

        static Texture2D Rounded(int w, int h, int radius)
        {
            if (w < 2) w = 2;
            if (h < 2) h = 2;
            if (radius < 1) radius = 1;
            if (radius > w / 2) radius = w / 2;
            if (radius > h / 2) radius = h / 2;
            var key = "r" + w + "x" + h + "x" + radius;
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
            var tex = Bake(w, h, pixels);
            Textures[key] = tex;
            return tex;
        }

        static Texture2D Donut(int percent)
        {
            if (percent < 0) percent = 0;
            if (percent > 100) percent = 100;
            var key = "donut" + percent;
            Texture2D cached;
            if (Textures.TryGetValue(key, out cached)) return cached;
            const int size = 176;
            var pixels = new Color[size * size];
            var center = (size - 1) / 2f;
            var outer = size * 0.46f;
            var inner = size * 0.30f;
            var sweep = percent / 100f * 6.2831853f;
            var blue = new Color(Blue.r / 255f, Blue.g / 255f, Blue.b / 255f, 1f);
            var track = new Color(Track.r / 255f, Track.g / 255f, Track.b / 255f, 1f);
            for (var y = 0; y < size; y++)
            {
                for (var x = 0; x < size; x++)
                {
                    var dx = x - center;
                    var dy = y - center;
                    var dist = (float)Math.Sqrt(dx * dx + dy * dy);
                    var edge = Math.Min(outer - dist, dist - inner);
                    if (edge <= -1.1f)
                    {
                        pixels[y * size + x] = new Color(1f, 1f, 1f, 0f);
                        continue;
                    }
                    var ang = (float)Math.Atan2(dx, dy);
                    if (ang < 0f) ang += 6.2831853f;
                    var filled = percent >= 100 || (percent > 0 && ang <= sweep);
                    var color = filled ? blue : track;
                    var alpha = edge >= 1.1f ? 1f : Math.Max(0f, (edge + 1.1f) / 2.2f);
                    pixels[y * size + x] = new Color(color.r, color.g, color.b, alpha);
                }
            }
            var tex = Bake(size, size, pixels);
            Textures[key] = tex;
            return tex;
        }

        static Texture2D GearIcon()
        {
            if (_gear != null) return _gear;
            const int n = 48;
            var pixels = new Color[n * n];
            var c = (n - 1) / 2f;
            for (var y = 0; y < n; y++)
            {
                for (var x = 0; x < n; x++)
                {
                    var dx = x - c;
                    var dy = y - c;
                    var dist = (float)Math.Sqrt(dx * dx + dy * dy);
                    var ang = (float)Math.Atan2(dy, dx);
                    var tooth = (float)(Math.Cos(ang * 8.0) * 0.5 + 0.5);
                    var outer = 15f + tooth * 6f;
                    var on = dist <= outer && dist >= 8f;
                    pixels[y * n + x] = new Color(1f, 1f, 1f, on ? 1f : 0f);
                }
            }
            _gear = Bake(n, n, pixels);
            return _gear;
        }

        static Texture2D BellIcon()
        {
            if (_bell != null) return _bell;
            const int n = 48;
            var pixels = new Color[n * n];
            var c = (n - 1) / 2f;
            for (var y = 0; y < n; y++)
            {
                for (var x = 0; x < n; x++)
                {
                    var dx = x - c;
                    var on = false;
                    var t = (y - 10f) / 22f;
                    if (t >= 0f && t <= 1f && Math.Abs(dx) <= 4f + t * 12f && y <= 34f) on = true;
                    if ((dx * dx + (y - 8f) * (y - 8f)) <= 9f) on = true;
                    if ((dx * dx + (y - 36f) * (y - 36f)) <= 10f) on = true;
                    pixels[y * n + x] = new Color(1f, 1f, 1f, on ? 1f : 0f);
                }
            }
            _bell = Bake(n, n, pixels);
            return _bell;
        }

        static Texture2D Bake(int w, int h, Color[] pixels)
        {
            var tex = new Texture2D(w, h);
            tex.wrapMode = TextureWrapMode.Clamp;
            tex.filterMode = FilterMode.Bilinear;
            tex.SetPixels(pixels);
            tex.Apply();
            return tex;
        }

        static void DestroyNamed(string name)
        {
            var existing = GameObject.Find(name);
            if (existing != null) UnityEngine.Object.DestroyImmediate(existing);
        }
    }
}
