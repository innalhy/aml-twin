using System;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace TwinAml
{
    /// <summary>
    /// Topic 4 investigation room. Primitives stand in for the set.
    /// The case file stays schema 0.1. This view only reads teaching.alerts.
    /// </summary>
    public sealed class TriageRoom : MonoBehaviour
    {
        enum Phase { Arrive, Queue, File, Feedback }

        const int ShiftSeconds = 25 * 60;

        Camera _cam;
        Phase _phase = Phase.Arrive;
        string _station = "overview";
        string _alertId = "";
        string _tab = "trigger";
        string _pending = "";
        string _sort = "file";
        bool _dirty;
        float _blend = 1f;
        Vector3 _fromPos;
        Vector3 _toPos;
        Vector3 _fromLook;
        Vector3 _toLook;
        Vector3 _look;

        Transform _mapNodes;
        Transform _linkNodes;
        readonly List<Transform> _billboards = new List<Transform>();
        readonly List<Transform> _dynamicLabels = new List<Transform>();
        readonly List<HotPulse> _hot = new List<HotPulse>();
        readonly List<FileCard> _cards = new List<FileCard>();

        Font _font;
        Text _timer;
        Text _coach;
        Text _drawerTitle;
        Text _gate;
        InputField _note;
        RectTransform _scrollContent;
        RectTransform _decisionRoot;
        RectTransform _scrollRect;
        Button _bClose;
        Button _bMore;
        Button _bEsc;
        Button _bRep;
        readonly List<RailButton> _rails = new List<RailButton>();

        sealed class HotPulse
        {
            public Renderer Renderer;
            public Color A;
            public Color B;
        }

        sealed class FileCard
        {
            public string Id;
            public Renderer Renderer;
        }

        sealed class RailButton
        {
            public string Station;
            public Image Image;
        }

        public static void Open()
        {
            var found = GameObject.Find("TriageRoom.Director");
            if (found != null)
            {
                found.SetActive(false);
                Destroy(found);
            }
            var go = new GameObject("TriageRoom.Director");
            go.AddComponent<TriageRoom>();
        }

        void Start()
        {
            _font = UiKit.Font;
            PrepareCamera();
            if (TriageShift.Alerts == null || TriageShift.Alerts.Count != 6)
            {
                BuildError(FlowController.Instance != null && !string.IsNullOrEmpty(FlowController.Instance.LastError)
                    ? FlowController.Instance.LastError
                    : "The shift file did not load. Open Topic 4 from the topics page.");
                return;
            }
            BuildWorld();
            BuildCanvas();
            var station = "desk";
            SceneId sceneId;
            if (SceneCatalog.TryParse(SceneManager.GetActiveScene().name, out sceneId))
                station = SceneCatalog.TriageStation(sceneId);
            Snap(station);
            RefreshNow();
        }

        void Update()
        {
            if (_cam == null) return;
            if (_blend < 1f)
            {
                _blend = Mathf.MoveTowards(_blend, 1f, Time.deltaTime * 1.35f);
                var t = Mathf.SmoothStep(0f, 1f, _blend);
                _cam.transform.position = Vector3.Lerp(_fromPos, _toPos, t);
                _look = Vector3.Lerp(_fromLook, _toLook, t);
                _cam.transform.LookAt(_look);
            }
            if (_timer != null)
            {
                if (!TriageShift.ClockOn) _timer.text = "25:00";
                else
                {
                    var left = ShiftSeconds - TriageShift.ElapsedSec();
                    _timer.text = left >= 0 ? Clock(left) : "Over " + Clock(-left);
                }
            }
            var pulse = 0.5f + 0.5f * Mathf.Sin(Time.time * 2.2f);
            for (var i = 0; i < _hot.Count; i++)
            {
                if (_hot[i].Renderer == null) continue;
                _hot[i].Renderer.material.color = Color.Lerp(_hot[i].A, _hot[i].B, pulse);
            }
            if (Input.GetMouseButtonDown(0)) TryRoomClick();
        }

        void LateUpdate()
        {
            if (_dirty)
            {
                _dirty = false;
                RefreshNow();
            }
            if (_cam == null) return;
            Billboard(_billboards);
            Billboard(_dynamicLabels);
        }

        void RequestRefresh()
        {
            _dirty = true;
        }

        void Billboard(List<Transform> list)
        {
            for (var i = list.Count - 1; i >= 0; i--)
            {
                var label = list[i];
                if (label == null)
                {
                    list.RemoveAt(i);
                    continue;
                }
                label.rotation = Quaternion.LookRotation(label.position - _cam.transform.position);
            }
        }

        void TryRoomClick()
        {
            if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject()) return;
            RaycastHit hit;
            if (!Physics.Raycast(_cam.ScreenPointToRay(Input.mousePosition), out hit, 40f)) return;
            var name = hit.collider.gameObject.name;
            if (name == "HotDesk") Rail("desk");
            else if (name == "HotMap") Rail("map");
            else if (name == "HotProfile") Rail("profile");
            else if (name == "HotLinks") Rail("links");
            else if (name == "HotSenior") Rail("senior");
            else if (name.StartsWith("HotFile_"))
            {
                MoveTo("profile");
                OpenAlert(name.Substring("HotFile_".Length), "kyc");
            }
        }

        void PrepareCamera()
        {
            _cam = Camera.main;
            if (_cam == null)
            {
                var go = new GameObject("Main Camera");
                go.tag = "MainCamera";
                _cam = go.AddComponent<Camera>();
                go.AddComponent<AudioListener>();
            }
            _cam.clearFlags = CameraClearFlags.SolidColor;
            _cam.backgroundColor = new Color(0.05f, 0.07f, 0.11f);
            _cam.fieldOfView = 58f;
            _cam.nearClipPlane = 0.08f;
            _cam.farClipPlane = 80f;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.55f, 0.62f, 0.72f);
        }

        void BuildError(string message)
        {
            var canvas = MakeCanvas();
            var panel = Pin(canvas.transform, "Error", 360f, 180f, 1200f, 420f);
            panel.gameObject.AddComponent<Image>().color = new Color(0.06f, 0.09f, 0.14f, 0.94f);
            var text = MakeText(panel, message, 22, FontStyle.Normal, Color.white, TextAnchor.UpperLeft);
            text.rectTransform.offsetMin = new Vector2(24f, 90f);
            text.rectTransform.offsetMax = new Vector2(-24f, -24f);
            var button = Pin(panel, "Back", 24f, 340f, 280f, 48f);
            MakeButton(button, "Bank branch", new Color(0.18f, 0.44f, 0.93f), Color.white, delegate
            {
                FlowController.Instance.Go(SceneId.Scn_Branch_Lobby);
            });
        }

        void BuildWorld()
        {
            var root = new GameObject("World").transform;
            root.SetParent(transform, false);

            Box(root, "Floor", new Vector3(0f, -0.06f, 0f), new Vector3(18f, 0.12f, 14f), Hex(0x1a2433), false);
            Box(root, "NorthWall", new Vector3(0f, 1.7f, 6.15f), new Vector3(16.2f, 3.4f, 0.18f), Hex(0x243246), false);
            Box(root, "WestWall", new Vector3(-8.05f, 1.7f, 0f), new Vector3(0.18f, 3.4f, 12.2f), Hex(0x243246), false);
            Box(root, "EastWall", new Vector3(8.05f, 1.7f, 0f), new Vector3(0.18f, 3.4f, 12.2f), Hex(0x2a3b50), false);
            Box(root, "SouthLedge", new Vector3(0f, 0.18f, -6.05f), new Vector3(16.2f, 0.36f, 0.16f), Hex(0x182230), false);

            Box(root, "MapPlate", new Vector3(0f, 1.72f, 5.82f), new Vector3(7.4f, 2.5f, 0.08f), Hex(0x101c2c), false);
            Box(root, "LinkPlate", new Vector3(7.72f, 1.72f, 0f), new Vector3(0.08f, 2.5f, 7.2f), Hex(0x101c2c), false);
            Box(root, "FilePlate", new Vector3(-7.72f, 1.72f, 0.1f), new Vector3(0.08f, 2.5f, 6.6f), Hex(0x101c2c), false);

            Box(root, "Desk", new Vector3(0f, 0.76f, -2.15f), new Vector3(2.8f, 0.08f, 1.35f), Hex(0x314256), false);
            Box(root, "Key", new Vector3(0f, 0.84f, -2.45f), new Vector3(0.72f, 0.04f, 0.24f), Hex(0x1b2836), false);
            Box(root, "Chair", new Vector3(0f, 0.42f, -3.25f), new Vector3(0.56f, 0.48f, 0.56f), Hex(0x3d4e62), false);
            Screen(root, -0.78f, "QUEUE");
            Screen(root, 0f, "CASE");
            Screen(root, 0.78f, "NOTE");

            Box(root, "MeetTable", new Vector3(-5.4f, 0.55f, -4.2f), new Vector3(1.8f, 0.08f, 0.9f), Hex(0x314256), false);
            Box(root, "MeetScreen", new Vector3(-5.4f, 1.35f, -4.7f), new Vector3(1.1f, 0.62f, 0.06f), Hex(0x14344c), false);
            WorldLabel(root, "Case brief", new Vector3(-5.4f, 1.35f, -4.62f), 0.035f, Hex(0xb7e3ff), true);
            Pad(root, "MeetPad", new Vector3(-5.4f, 0.02f, -3.2f), new Vector3(1.2f, 0.03f, 0.6f), Hex(0x2f6fed), "MEET");

            Box(root, "SeniorDesk", new Vector3(5.7f, 0.72f, 3.55f), new Vector3(1.5f, 0.08f, 0.8f), Hex(0x314256), false);
            Shape(root, "Senior", PrimitiveType.Capsule, new Vector3(6.15f, 1.05f, 4.15f), new Vector3(0.42f, 0.55f, 0.42f), Hex(0x8ea0b8), false);
            WorldLabel(root, "Senior investigator", new Vector3(6.15f, 2.05f, 4.15f), 0.045f, Hex(0xf2f6fb), true);

            Pad(root, "DeskPad", new Vector3(0f, 0.02f, -3.7f), new Vector3(1.4f, 0.03f, 0.7f), Hex(0xc4842a), "DESK");
            Pad(root, "MapPad", new Vector3(0f, 0.02f, 3.3f), new Vector3(1.3f, 0.03f, 0.7f), Hex(0x2f6fed), "MAP");
            Pad(root, "FilePad", new Vector3(-5.3f, 0.02f, 0.1f), new Vector3(0.7f, 0.03f, 1.3f), Hex(0x2f6fed), "FILES");
            Pad(root, "LinkPad", new Vector3(5.1f, 0.02f, 0.1f), new Vector3(0.7f, 0.03f, 1.3f), Hex(0xf5a524), "LINKS");
            Pad(root, "SeniorPad", new Vector3(4.2f, 0.02f, 3.2f), new Vector3(1.1f, 0.03f, 0.7f), Hex(0x1f8a5b), "SENIOR");

            Hot(root, "HotDesk", new Vector3(0f, 0.9f, -2.9f), new Vector3(3.4f, 1.6f, 3.6f));
            Hot(root, "HotMap", new Vector3(0f, 1.6f, 5.5f), new Vector3(7.2f, 2.4f, 0.8f));
            Hot(root, "HotProfile", new Vector3(-7.2f, 1.6f, 0.1f), new Vector3(1.1f, 2.4f, 6.4f));
            Hot(root, "HotLinks", new Vector3(7.2f, 1.6f, 0f), new Vector3(1.1f, 2.4f, 7f));
            Hot(root, "HotSenior", new Vector3(5.8f, 1.1f, 3.8f), new Vector3(2.2f, 2f, 1.8f));

            WorldLabel(root, "Transaction monitoring unit", new Vector3(0f, 3.15f, 5.7f), 0.07f, Hex(0xf2f6fb), true);
            WorldLabel(root, "Circle = person or company    Disk = account or place    Cube = document, address, or phone", new Vector3(7.35f, 3.15f, 0f), 0.035f, Hex(0xd5deea), true);

            _mapNodes = new GameObject("MapNodes").transform;
            _mapNodes.SetParent(root, false);
            _linkNodes = new GameObject("LinkNodes").transform;
            _linkNodes.SetParent(root, false);

            for (var i = 0; i < TriageShift.Alerts.Count; i++)
            {
                var alert = TriageShift.Alerts[i];
                var z = -2.35f + i * 0.95f;
                var card = Shape(root, "HotFile_" + alert.Id, PrimitiveType.Cube, new Vector3(-7.48f, 1.72f, z), new Vector3(0.12f, 0.72f, 0.82f), Hex(0x1b3a56), true);
                _cards.Add(new FileCard { Id = alert.Id, Renderer = card.GetComponent<Renderer>() });
                WorldLabel(root, alert.Id + "\n" + Short(alert.CustomerName), new Vector3(-7.15f, 1.72f, z), 0.032f, Hex(0xf7f9fb), true);
            }
            PaintCards();
        }

        void Screen(Transform root, float x, string title)
        {
            Box(root, "Monitor", new Vector3(x, 1.18f, -1.58f), new Vector3(0.62f, 0.4f, 0.05f), Hex(0x14344c), false);
            WorldLabel(root, title, new Vector3(x, 1.18f, -1.5f), 0.04f, Hex(0xb7e3ff), true);
        }

        void Pad(Transform root, string name, Vector3 pos, Vector3 scale, Color color, string title)
        {
            Box(root, name, pos, scale, color, false);
            WorldLabel(root, title, pos + new Vector3(0f, 0.35f, 0f), 0.05f, Hex(0xfff8ec), true);
        }

        void PaintCards()
        {
            for (var i = 0; i < _cards.Count; i++)
            {
                var work = TriageShift.WorkFor(_cards[i].Id);
                var color = Hex(0x1b3a56);
                if (work != null && !string.IsNullOrEmpty(work.DecisionKey))
                {
                    var alert = TriageShift.Alert(_cards[i].Id);
                    var grade = alert != null ? alert.Grade(work.DecisionKey) : "miss";
                    if (grade == "correct") color = Hex(0x1f8a5b);
                    else if (grade == "acceptable") color = Hex(0xc4842a);
                    else color = Hex(0x9f2d2a);
                }
                else if (_cards[i].Id == _alertId) color = Hex(0xf5a524);
                if (_cards[i].Renderer != null) _cards[i].Renderer.material.color = color;
            }
        }

        void RebuildBoards()
        {
            ClearChildren(_mapNodes);
            ClearChildren(_linkNodes);
            _dynamicLabels.Clear();
            _hot.Clear();
            var alert = TriageShift.Alert(_alertId);
            if (alert == null)
            {
                DynamicLabel(_mapNodes, "Open an alert at the desk.\nThe map draws that file.", new Vector3(0f, 1.72f, 5.55f));
                DynamicLabel(_linkNodes, "Open an alert at the desk.\nThe link board draws that file.", new Vector3(7.35f, 1.72f, 0f));
                PaintCards();
                return;
            }
            DrawBoard(_mapNodes, alert.MapPlaces, alert.MapFlows, true);
            DrawBoard(_linkNodes, alert.LinkNodes, alert.LinkEdges, false);
            PaintCards();
        }

        void DrawBoard(Transform parent, List<BoardNode> nodes, List<BoardEdge> edges, bool map)
        {
            var placed = new Dictionary<string, Vector3>();
            for (var i = 0; i < nodes.Count; i++)
            {
                var node = nodes[i];
                var pos = map
                    ? new Vector3(node.X * 1.45f, 1.65f + node.Y * 1.0f, 5.58f)
                    : new Vector3(7.48f, 1.65f + node.Y * 1.0f, -node.X * 1.35f);
                placed[node.Id] = pos;
                var hot = node.Hot || (map && node.Kind == "country" && node.Label.IndexOf("higher", StringComparison.OrdinalIgnoreCase) >= 0);
                var color = NodeColor(node.Kind, hot);
                var shape = Shape(parent, node.Id, MeshFor(node.Kind), pos, MeshScale(node.Kind), color, false);
                if (hot)
                {
                    _hot.Add(new HotPulse { Renderer = shape.GetComponent<Renderer>(), A = color, B = Hex(0xffb4a8) });
                }
                DynamicLabel(parent, node.Label, pos + new Vector3(0f, 0.34f, 0f));
            }
            for (var i = 0; i < edges.Count; i++)
            {
                Vector3 a;
                Vector3 b;
                if (!placed.TryGetValue(edges[i].From, out a) || !placed.TryGetValue(edges[i].To, out b)) continue;
                Beam(parent, a, b, Hex(0xf5a524));
            }
        }

        void BuildCanvas()
        {
            var canvas = MakeCanvas();
            var header = Pin(canvas.transform, "Header", 0f, 0f, 1920f, 56f);
            var headerImage = header.gameObject.AddComponent<Image>();
            headerImage.color = new Color(0.05f, 0.1f, 0.16f, 0.94f);
            var title = MakeText(header, "Transaction monitoring unit   ·   synthetic shift   ·   instructions in English", 20, FontStyle.Bold, Color.white, TextAnchor.MiddleLeft);
            title.rectTransform.offsetMin = new Vector2(24f, 0f);
            title.rectTransform.offsetMax = new Vector2(-520f, 0f);
            var timerRect = Pin(header, "Timer", 860f, 8f, 200f, 40f);
            _timer = MakeText(timerRect, "25:00", 22, FontStyle.Bold, new Color(0.96f, 0.78f, 0.35f), TextAnchor.MiddleCenter);
            Stretch(_timer.rectTransform);
            var leave = Pin(header, "Leave", 1680f, 8f, 216f, 40f);
            MakeButton(leave, "Bank branch", new Color(0.12f, 0.2f, 0.32f), Color.white, delegate
            {
                ReadNote();
                FlowController.Instance.Go(SceneId.Scn_Branch_Lobby);
            });

            AddRail(canvas.transform, "Overview", "overview", 76f);
            AddRail(canvas.transform, "Analyst desk", "desk", 128f);
            AddRail(canvas.transform, "Map wall", "map", 180f);
            AddRail(canvas.transform, "Customer wall", "profile", 232f);
            AddRail(canvas.transform, "Link board", "links", 284f);
            AddRail(canvas.transform, "Senior investigator", "senior", 336f);
            AddRail(canvas.transform, "Meeting", "meeting", 388f);

            var coach = Pin(canvas.transform, "Coach", 24f, 900f, 1040f, 156f);
            coach.gameObject.AddComponent<Image>().color = new Color(0.05f, 0.09f, 0.14f, 0.9f);
            _coach = MakeText(coach, "", 16, FontStyle.Normal, new Color(0.93f, 0.95f, 0.97f), TextAnchor.UpperLeft);
            _coach.rectTransform.offsetMin = new Vector2(16f, 12f);
            _coach.rectTransform.offsetMax = new Vector2(-16f, -12f);

            var drawer = Pin(canvas.transform, "Drawer", 1088f, 68f, 808f, 988f);
            drawer.gameObject.AddComponent<Image>().color = new Color(0.06f, 0.09f, 0.14f, 0.94f);
            var titleRect = Pin(drawer, "DrawerTitle", 16f, 10f, 776f, 52f);
            _drawerTitle = MakeText(titleRect, "", 22, FontStyle.Bold, Color.white, TextAnchor.MiddleLeft);
            Stretch(_drawerTitle.rectTransform);

            var scrollGo = Pin(drawer, "Scroll", 12f, 70f, 784f, 760f);
            _scrollRect = scrollGo;
            var scroll = scrollGo.gameObject.AddComponent<ScrollRect>();
            scroll.horizontal = false;
            scroll.vertical = true;
            scroll.movementType = ScrollRect.MovementType.Clamped;
            scroll.scrollSensitivity = 28f;
            var viewport = StretchNew(scrollGo, "Viewport");
            viewport.gameObject.AddComponent<RectMask2D>();
            var hit = viewport.gameObject.AddComponent<Image>();
            hit.color = new Color(1f, 1f, 1f, 0.02f);
            scroll.viewport = viewport;
            var contentGo = new GameObject("Content", typeof(RectTransform));
            contentGo.transform.SetParent(viewport, false);
            _scrollContent = contentGo.GetComponent<RectTransform>();
            _scrollContent.anchorMin = new Vector2(0f, 1f);
            _scrollContent.anchorMax = new Vector2(1f, 1f);
            _scrollContent.pivot = new Vector2(0.5f, 1f);
            _scrollContent.anchoredPosition = Vector2.zero;
            _scrollContent.sizeDelta = new Vector2(0f, 400f);
            scroll.content = _scrollContent;

            _decisionRoot = Pin(drawer, "Decisions", 12f, 836f, 784f, 140f);
            var gateRect = Pin(drawer, "Gate", 16f, 788f, 776f, 44f);
            _gate = MakeText(gateRect, "", 15, FontStyle.Bold, new Color(0.96f, 0.86f, 0.55f), TextAnchor.MiddleLeft);
            Stretch(_gate.rectTransform);
        }

        void AddRail(Transform canvas, string label, string station, float y)
        {
            var rect = Pin(canvas, "Rail" + station, 24f, y, 250f, 46f);
            var image = rect.gameObject.AddComponent<Image>();
            image.color = new Color(0.08f, 0.14f, 0.22f, 0.88f);
            var button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            var captured = station;
            button.onClick.AddListener(delegate { Rail(captured); });
            var text = MakeText(rect, label, 16, FontStyle.Bold, Color.white, TextAnchor.MiddleCenter);
            Stretch(text.rectTransform);
            _rails.Add(new RailButton { Station = station, Image = image });
        }

        void RefreshNow()
        {
            ReadNote();
            _note = null;
            _bClose = null;
            _bMore = null;
            _bEsc = null;
            _bRep = null;
            ClearChildren(_scrollContent);
            ClearChildren(_decisionRoot);
            var stack = new Stack(_scrollContent, 744f, _font);
            if (_phase == Phase.Arrive) FillArrive(stack);
            else if (_phase == Phase.Queue) FillQueue(stack);
            else if (_phase == Phase.File) FillFile(stack);
            else FillFeedback(stack);
            _scrollContent.sizeDelta = new Vector2(0f, stack.Y + 24f);
            _scrollContent.anchoredPosition = Vector2.zero;
            LayoutDrawer();
            PaintRails();
            if (_coach != null) _coach.text = CoachText();
            if (_gate != null && _phase != Phase.File) _gate.text = "";
            UpdateGate();
            RebuildBoards();
        }

        void LayoutDrawer()
        {
            var file = _phase == Phase.File;
            _decisionRoot.gameObject.SetActive(file);
            if (_gate != null) _gate.gameObject.SetActive(file);
            var scroll = _scrollRect;
            scroll.sizeDelta = new Vector2(784f, file ? 700f : 900f);
        }

        void FillArrive(Stack stack)
        {
            _drawerTitle.text = "Read this, then sit down";
            stack.Paragraph("You are a new transaction-monitoring analyst. An alert means the system saw activity that may not fit the customer. Your job is to check the facts and choose a path. You are not asked to memorise a statute.", 18, FontStyle.Normal, Color.white);
            stack.Paragraph("How this room works", 20, FontStyle.Bold, new Color(0.96f, 0.78f, 0.35f));
            stack.Paragraph("1. Sit at the desk and open the queue. Six fictional alerts are waiting.\n2. Open a same-day sanctions hit (A5) or a fast outflow (A1 or A6) before a file that only needs documents (A3). Amount is not the same thing as urgency. A5 has no payment and is still first.\n3. For each alert, use the buttons on the left, or click that part of the room. Read Why, Payments, the customer File, the Map, and the Links.\n4. Mark a red flag only when you can point to it in those sources.\n5. Write a note a colleague could audit: what happened, why it does not fit, and what should happen next. Aim for 80 to 200 characters. 50 unlocks the decision.\n6. Choose one path. Then read the senior investigator. You cannot edit a filed decision.", 17, FontStyle.Normal, new Color(0.9f, 0.93f, 0.96f));
            stack.Paragraph("The four paths", 20, FontStyle.Bold, new Color(0.96f, 0.78f, 0.35f));
            stack.Paragraph("Close — the explanation is clear, consistent, and nothing suspicious remains. None of these six is that case. Close is on the screen so you learn what it is for. Closing any of them fails the shift.\n\nAsk for more information — a document or an answer can fill a real gap. This is the right first step when papers do not agree.\n\nEscalate — several red flags, a network, or a pattern you cannot explain. A senior investigator should take the file.\n\nDraft an STR — you have reasonable suspicion that the funds are criminal proceeds or linked to terrorist financing. STR means suspicious transaction report. Reporting is a duty, not a punishment. Never tell the customer. Filing one only because two names look alike fails the shift.\n\nThis room writes a training flag. It does not contact a financial intelligence unit.", 17, FontStyle.Normal, new Color(0.9f, 0.93f, 0.96f));
            stack.Paragraph("Everyone here is fictional. Port Amber, Harbour, and the sanctions sheet are training props, not a live country list or a government list. Ongoing monitoring, in the FATF standards, tests activity against what the institution knows about the customer.", 17, FontStyle.Normal, new Color(0.75f, 0.82f, 0.9f));
            stack.Button("Sit at the analyst desk", Hex(0xf5a524), Hex(0x1a1204), Sit);
        }

        void FillQueue(Stack stack)
        {
            _drawerTitle.text = "Alert queue    ·    " + TriageShift.DecidedCount() + " of 6 decided";
            if (TriageShift.AllDecided())
                stack.Button("File the shift and read your report", Hex(0x1f8a5b), Color.white, FileShift);
            stack.Paragraph("Sort the queue. Then open a card. A filed card stays filed.", 16, FontStyle.Normal, new Color(0.8f, 0.86f, 0.92f));
            stack.Choices(
                new[] { "File order", "Amount", "Deadline", "Risk", "Region" },
                new[] { _sort == "file", _sort == "amount", _sort == "deadline", _sort == "risk", _sort == "region" },
                delegate(int index)
                {
                    var keys = new[] { "file", "amount", "deadline", "risk", "region" };
                    _sort = keys[index];
                    RequestRefresh();
                });
            var alerts = TriageShift.Sorted(_sort);
            for (var i = 0; i < alerts.Count; i++)
            {
                var alert = alerts[i];
                var work = TriageShift.WorkFor(alert.Id);
                var state = "Not opened";
                if (work != null && work.OpenOrder > 0 && string.IsNullOrEmpty(work.DecisionKey)) state = "In review";
                if (work != null && !string.IsNullOrEmpty(work.DecisionKey))
                    state = "Filed  ·  " + TriageLibrary.DecisionLabel(work.DecisionKey);
                var body = alert.Id + "   " + alert.Title + "\n" +
                    alert.CustomerName + "\n" +
                    alert.Priority + "   ·   " + alert.Deadline + "   ·   " + alert.AmountLabel + "\n" +
                    alert.RiskTag + "   ·   " + alert.Region + "   ·   " + state;
                var id = alert.Id;
                var filed = work != null && !string.IsNullOrEmpty(work.DecisionKey);
                stack.Button(body, filed ? Hex(0x1b3a56) : Hex(0x122033), Color.white, delegate
                {
                    MoveTo("desk");
                    OpenAlert(id, "trigger");
                });
            }
        }

        void FillFile(Stack stack)
        {
            var alert = TriageShift.Alert(_alertId);
            var work = TriageShift.WorkFor(_alertId);
            if (alert == null || work == null)
            {
                _phase = Phase.Queue;
                FillQueue(stack);
                return;
            }
            _drawerTitle.text = alert.Id + "   " + alert.Title;
            stack.Paragraph(alert.CustomerName + "   ·   " + alert.CustomerId + "\n" + alert.CustomerType + "   ·   " + alert.Occupation + "\n" + alert.AmountLabel + "   ·   " + alert.Priority + "   ·   due " + alert.Deadline, 16, FontStyle.Normal, new Color(0.85f, 0.9f, 0.95f));
            stack.Choices(
                new[] { "Why", "Pay", "File", "Map", "Links", "Check" },
                new[] { _tab == "trigger", _tab == "tx", _tab == "kyc", _tab == "map", _tab == "links", _tab == "screen" },
                delegate(int index)
                {
                    var tabs = new[] { "trigger", "tx", "kyc", "map", "links", "screen" };
                    var stations = new[] { "desk", "desk", "profile", "map", "links", "profile" };
                    MoveTo(stations[index]);
                    SetTab(tabs[index]);
                });
            stack.Paragraph("Why = this alert. Pay = transactions. File = customer (KYC). Map = where the money touches. Links = shared people and addresses. Check = screening and news.", 14, FontStyle.Normal, new Color(0.7f, 0.78f, 0.86f));

            if (_tab == "trigger")
            {
                stack.Paragraph("What the system saw", 18, FontStyle.Bold, Color.white);
                stack.Paragraph(alert.Trigger, 17, FontStyle.Normal, Color.white);
                stack.Paragraph("What to look for", 18, FontStyle.Bold, new Color(0.96f, 0.78f, 0.35f));
                stack.Paragraph(alert.Guide, 17, FontStyle.Normal, Color.white);
            }
            else if (_tab == "tx")
            {
                stack.Paragraph("Transactions. Read the amount, the other party, and the timing.", 16, FontStyle.Italic, new Color(0.8f, 0.86f, 0.92f));
                for (var i = 0; i < alert.Transactions.Count; i++)
                {
                    var tx = alert.Transactions[i];
                    stack.Paragraph(tx.When + "   ·   " + tx.What + "   ·   " + tx.Amount + "\n" + tx.Detail, 16, FontStyle.Normal, Color.white);
                }
            }
            else if (_tab == "kyc")
            {
                stack.Paragraph("Customer file. KYC means what the institution already knows about this customer.", 16, FontStyle.Italic, new Color(0.8f, 0.86f, 0.92f));
                stack.Paragraph(Join(alert.Kyc), 16, FontStyle.Normal, Color.white);
            }
            else if (_tab == "map")
            {
                stack.Paragraph("The wall on your right-hand view is a training map, not a live payment network. Amber marks a place this shift treats as higher risk.", 16, FontStyle.Italic, new Color(0.8f, 0.86f, 0.92f));
                stack.Paragraph(Join(alert.GeographyNotes), 16, FontStyle.Normal, Color.white);
                stack.Paragraph(FlowLines(alert.MapPlaces, alert.MapFlows), 16, FontStyle.Normal, Color.white);
            }
            else if (_tab == "links")
            {
                stack.Paragraph("Circles are people or companies. Disks are accounts or places. Cubes are documents, addresses, or phones. On A4, look for one address, one phone, and one person at the end of the money.", 16, FontStyle.Italic, new Color(0.8f, 0.86f, 0.92f));
                stack.Paragraph(FlowLines(alert.LinkNodes, alert.LinkEdges), 16, FontStyle.Normal, Color.white);
            }
            else
            {
                stack.Paragraph("Screening and news. A similar name is a question. It is not, by itself, a report.", 16, FontStyle.Italic, new Color(0.8f, 0.86f, 0.92f));
                stack.Paragraph(Join(alert.Screening), 16, FontStyle.Normal, Color.white);
                if (alert.News.Count > 0) stack.Paragraph(Join(alert.News), 16, FontStyle.Normal, new Color(0.8f, 0.86f, 0.92f));
            }

            stack.Paragraph("Red flags. Mark one only when you can see it above or on the wall.", 16, FontStyle.Bold, new Color(0.96f, 0.78f, 0.35f));
            for (var i = 0; i < alert.RedFlags.Count; i++)
            {
                var flag = alert.RedFlags[i];
                var on = work.Marked.Contains(flag.Id);
                var id = flag.Id;
                stack.Button((on ? "Marked  ·  " : "Mark  ·  ") + flag.Title, on ? Hex(0xc4842a) : Hex(0x1b3a56), Color.white, delegate { ToggleFlag(id); });
            }
            stack.Paragraph("Your note. Facts, the gap, and the next step. 50 characters unlock the decision. 80 to 200 is the aim.", 16, FontStyle.Bold, Color.white);
            stack.Button("Insert the red flags you marked", Hex(0x1b3a56), Color.white, InsertFlags);
            _note = stack.Note(work.Note, delegate(string value)
            {
                work.Note = value ?? "";
                UpdateGate();
            });
            BuildDecisions();
        }

        void FillFeedback(Stack stack)
        {
            var alert = TriageShift.Alert(_alertId);
            _drawerTitle.text = alert != null ? "Senior investigator  ·  " + alert.Id : "Senior investigator";
            var lines = TriageShift.Feedback(_alertId);
            for (var i = 0; i < lines.Count; i++)
                stack.Paragraph(lines[i], 16, FontStyle.Normal, Color.white);
            stack.Button("Back to the queue", Hex(0xf5a524), Hex(0x1a1204), delegate
            {
                _phase = Phase.Queue;
                _pending = "";
                MoveTo("desk");
                RequestRefresh();
            });
            if (TriageShift.AllDecided())
                stack.Button("File the shift and read your report", Hex(0x1f8a5b), Color.white, FileShift);
        }

        void BuildDecisions()
        {
            if (!string.IsNullOrEmpty(_pending))
            {
                var label = MakeText(_decisionRoot, "File this as: " + TriageLibrary.DecisionLabel(_pending) + "?\nYour note stays on the record. You cannot change it.", 16, FontStyle.Bold, Color.white, TextAnchor.UpperLeft);
                label.rectTransform.anchoredPosition = new Vector2(8f, -4f);
                label.rectTransform.sizeDelta = new Vector2(760f, 48f);
                var back = Pin(_decisionRoot, "Back", 8f, 64f, 360f, 64f);
                MakeButton(back, "Back", Hex(0x1b3a56), Color.white, delegate { _pending = ""; RequestRefresh(); });
                var ok = Pin(_decisionRoot, "File", 384f, 64f, 380f, 64f);
                MakeButton(ok, "File the decision", Hex(0x1f8a5b), Color.white, Confirm);
                return;
            }
            _bClose = DecisionButton("Close", "close", 8f, 8f);
            _bMore = DecisionButton("Ask for more\ninformation", "more", 396f, 8f);
            _bEsc = DecisionButton("Escalate the\ninvestigation", "escalate", 8f, 74f);
            _bRep = DecisionButton("Draft an STR", "report", 396f, 74f);
        }

        Button DecisionButton(string label, string key, float x, float y)
        {
            var rect = Pin(_decisionRoot, key, x, y, 372f, 60f);
            var captured = key;
            return MakeButton(rect, label, Hex(0x2f6fed), Color.white, delegate { Pick(captured); });
        }

        void Sit()
        {
            TriageShift.StartClock();
            _phase = Phase.Queue;
            MoveTo("desk");
            RequestRefresh();
        }

        void Rail(string station)
        {
            ReadNote();
            MoveTo(station);
            if (station == "overview") _phase = Phase.Arrive;
            else if (station == "desk")
            {
                if (_phase != Phase.File && _phase != Phase.Feedback) _phase = Phase.Queue;
            }
            else if (station == "map" && _phase == Phase.File)
            {
                SetTab("map");
                return;
            }
            else if (station == "profile" && _phase == Phase.File)
            {
                SetTab("kyc");
                return;
            }
            else if (station == "links" && _phase == Phase.File)
            {
                SetTab("links");
                return;
            }
            else if (station == "senior")
            {
                var work = TriageShift.WorkFor(_alertId);
                if (work != null && !string.IsNullOrEmpty(work.DecisionKey)) _phase = Phase.Feedback;
            }
            RequestRefresh();
        }

        void OpenAlert(string id, string tab)
        {
            ReadNote();
            var work = TriageShift.WorkFor(id);
            if (work == null) return;
            if (work.OpenOrder == 0) work.OpenOrder = ++TriageShift.OpenCounter;
            _alertId = id;
            _pending = "";
            if (!string.IsNullOrEmpty(work.DecisionKey))
            {
                _phase = Phase.Feedback;
                _tab = "trigger";
            }
            else
            {
                _phase = Phase.File;
                _tab = string.IsNullOrEmpty(tab) ? "trigger" : tab;
                MarkPanel(work, _tab);
            }
            RequestRefresh();
        }

        void SetTab(string tab)
        {
            _tab = tab;
            var work = TriageShift.WorkFor(_alertId);
            if (work != null && string.IsNullOrEmpty(work.DecisionKey)) MarkPanel(work, tab);
            RequestRefresh();
        }

        static void MarkPanel(AlertWork work, string tab)
        {
            if (tab == "tx" || tab == "kyc" || tab == "map" || tab == "links" || tab == "screen")
                work.Panels.Add(tab);
        }

        void ToggleFlag(string flagId)
        {
            ReadNote();
            var work = TriageShift.WorkFor(_alertId);
            if (work == null || !string.IsNullOrEmpty(work.DecisionKey)) return;
            if (work.Marked.Contains(flagId)) work.Marked.Remove(flagId);
            else work.Marked.Add(flagId);
            RequestRefresh();
        }

        void InsertFlags()
        {
            ReadNote();
            var alert = TriageShift.Alert(_alertId);
            var work = TriageShift.WorkFor(_alertId);
            if (alert == null || work == null) return;
            var builder = new StringBuilder(work.Note ?? "");
            var added = false;
            for (var i = 0; i < alert.RedFlags.Count; i++)
            {
                if (!work.Marked.Contains(alert.RedFlags[i].Id)) continue;
                if (builder.Length > 0 && builder[builder.Length - 1] != '\n') builder.Append('\n');
                builder.Append("- ").Append(alert.RedFlags[i].Title);
                added = true;
            }
            if (!added)
            {
                if (_coach != null)
                    _coach.text = "Mark a red flag first, or write the facts in your own words. This button only inserts flags you have already marked.";
                return;
            }
            work.Note = builder.ToString();
            RequestRefresh();
        }

        void Pick(string key)
        {
            ReadNote();
            var work = TriageShift.WorkFor(_alertId);
            if (work == null || !string.IsNullOrEmpty(work.DecisionKey) || !Unlocked(work)) return;
            _pending = key;
            RequestRefresh();
        }

        void Confirm()
        {
            ReadNote();
            var work = TriageShift.WorkFor(_alertId);
            if (work == null || string.IsNullOrEmpty(_pending) || !Unlocked(work)) return;
            work.DecisionKey = _pending;
            _pending = "";
            _phase = Phase.Feedback;
            MoveTo("senior");
            RequestRefresh();
        }

        void FileShift()
        {
            ReadNote();
            if (FlowController.Instance == null) return;
            FlowController.Instance.FinishTriage();
            if (_coach != null && FlowController.Instance != null && !string.IsNullOrEmpty(FlowController.Instance.LastError))
                _coach.text = FlowController.Instance.LastError;
        }

        void ReadNote()
        {
            if (_note == null || string.IsNullOrEmpty(_alertId)) return;
            var work = TriageShift.WorkFor(_alertId);
            if (work != null && string.IsNullOrEmpty(work.DecisionKey))
                work.Note = _note.text ?? "";
        }

        void UpdateGate()
        {
            if (_gate == null || _phase != Phase.File) return;
            var work = TriageShift.WorkFor(_alertId);
            if (work == null) return;
            var len = _note != null ? (_note.text ?? "").Trim().Length : (work.Note ?? "").Trim().Length;
            var panels = PanelCount(work);
            var ok = panels >= 2 && len >= 50;
            _gate.text = (ok ? "You can decide.  " : "Decisions are locked.  ") +
                "Sources opened: " + panels + " of 2.   Note: " + len + " / 50 characters.";
            var on = ok && string.IsNullOrEmpty(_pending);
            if (_bClose != null) _bClose.interactable = on;
            if (_bMore != null) _bMore.interactable = on;
            if (_bEsc != null) _bEsc.interactable = on;
            if (_bRep != null) _bRep.interactable = on;
        }

        static int PanelCount(AlertWork work)
        {
            var n = 0;
            if (work.Panels.Contains("tx")) n++;
            if (work.Panels.Contains("kyc")) n++;
            if (work.Panels.Contains("map")) n++;
            if (work.Panels.Contains("links")) n++;
            if (work.Panels.Contains("screen")) n++;
            return n;
        }

        static bool Unlocked(AlertWork work)
        {
            var len = work.Note != null ? work.Note.Trim().Length : 0;
            return PanelCount(work) >= 2 && len >= 50;
        }

        string CoachText()
        {
            if (_phase == Phase.Arrive)
                return "The card on the right is your briefing. Nothing in this room is a live bank system. When you finish reading, sit at the desk. You can come back to this card from Overview.";
            if (_phase == Phase.Queue)
                return "Open A5 (sanctions hit, two hours, no payment) or A1 or A6 (money already moving) before A3 (papers that can wait). Click a card, a floor label, or a wall. Closing any of these six fails the shift. Drafting an STR on A5 only because the names match also fails it.";
            if (_phase == Phase.Feedback)
                return "This note is the senior investigator, a training prop. Your decision stays filed. Do not tell the customer that an STR was drafted or might be drafted. That is tipping off. Then take the next alert.";
            var work = TriageShift.WorkFor(_alertId);
            var seniorHint = "";
            if (_station == "senior" && (work == null || string.IsNullOrEmpty(work.DecisionKey)))
                seniorHint = " File a decision before the senior note appears.";
            return "Open at least two sources (Pay, File, Map, Links, or Check) and write 50 characters before the four paths unlock. Close = a clear explanation, and that is not these files. Ask = a document can fill the gap. Escalate = several red flags or a network. Draft an STR = reasonable suspicion of criminal proceeds or terrorist financing. Never tell the customer." + seniorHint;
        }

        void PaintRails()
        {
            for (var i = 0; i < _rails.Count; i++)
            {
                var on = _rails[i].Station == _station;
                _rails[i].Image.color = on
                    ? new Color(0.96f, 0.65f, 0.14f, 0.95f)
                    : new Color(0.08f, 0.14f, 0.22f, 0.88f);
            }
        }

        void MoveTo(string station)
        {
            _station = station;
            _fromPos = _cam.transform.position;
            _fromLook = _look;
            if (station == "desk")
            {
                _toPos = new Vector3(0f, 1.62f, -4.75f);
                _toLook = new Vector3(0f, 1.22f, -1.5f);
            }
            else if (station == "map")
            {
                _toPos = new Vector3(0f, 1.7f, 2.15f);
                _toLook = new Vector3(0f, 1.7f, 5.7f);
            }
            else if (station == "profile")
            {
                _toPos = new Vector3(-4.15f, 1.65f, 0.15f);
                _toLook = new Vector3(-7.5f, 1.65f, 0.15f);
            }
            else if (station == "links")
            {
                _toPos = new Vector3(4.15f, 1.65f, 0.05f);
                _toLook = new Vector3(7.6f, 1.65f, 0.05f);
            }
            else if (station == "senior")
            {
                _toPos = new Vector3(2.6f, 1.75f, 1.35f);
                _toLook = new Vector3(6.0f, 1.35f, 3.9f);
            }
            else if (station == "meeting")
            {
                _toPos = new Vector3(-3.1f, 1.8f, -2.2f);
                _toLook = new Vector3(-5.4f, 1.1f, -4.3f);
            }
            else
            {
                _station = "overview";
                _toPos = new Vector3(0f, 7.5f, -12.4f);
                _toLook = new Vector3(0f, 0.7f, 0.2f);
            }
            _blend = 0f;
        }

        void Snap(string station)
        {
            MoveTo(station);
            _blend = 1f;
            _cam.transform.position = _toPos;
            _look = _toLook;
            _cam.transform.LookAt(_look);
        }

        static string Join(List<string> lines)
        {
            if (lines == null || lines.Count == 0) return "Nothing else is on this training file.";
            var builder = new StringBuilder();
            for (var i = 0; i < lines.Count; i++)
            {
                if (i > 0) builder.Append("\n\n");
                builder.Append(lines[i]);
            }
            return builder.ToString();
        }

        static string FlowLines(List<BoardNode> nodes, List<BoardEdge> edges)
        {
            var names = new Dictionary<string, string>();
            for (var i = 0; i < nodes.Count; i++) names[nodes[i].Id] = nodes[i].Label.Replace("\n", " ");
            if (edges == null || edges.Count == 0) return "No movement line on this picture. The place labels are the whole map.";
            var builder = new StringBuilder();
            for (var i = 0; i < edges.Count; i++)
            {
                if (i > 0) builder.Append("\n");
                string from;
                string to;
                if (!names.TryGetValue(edges[i].From, out from)) from = edges[i].From;
                if (!names.TryGetValue(edges[i].To, out to)) to = edges[i].To;
                builder.Append(from).Append("  ->  ").Append(to);
                if (!string.IsNullOrEmpty(edges[i].Label)) builder.Append("   (").Append(edges[i].Label).Append(")");
            }
            return builder.ToString();
        }

        static string Short(string name)
        {
            if (string.IsNullOrEmpty(name)) return "";
                if (name.Length <= 22) return name;
            return name.Substring(0, 20) + "...";
        }

        static string Clock(int seconds)
        {
            if (seconds < 0) seconds = 0;
            var m = seconds / 60;
            var s = seconds % 60;
            return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
        }

        GameObject MakeCanvas()
        {
            var canvasGo = new GameObject("TriageRoom.UI");
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 20;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
            canvasGo.AddComponent<GraphicRaycaster>();
            var events = new GameObject("TriageRoom.Events");
            events.transform.SetParent(transform, false);
            events.AddComponent<EventSystem>();
            events.AddComponent<StandaloneInputModule>();
            return canvasGo;
        }

        Text MakeText(Transform parent, string value, int size, FontStyle style, Color color, TextAnchor align)
        {
            var go = new GameObject("Label", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var text = go.AddComponent<Text>();
            text.font = _font;
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

        Button MakeButton(RectTransform rect, string label, Color background, Color ink, Action onClick)
        {
            var image = rect.GetComponent<Image>();
            if (image == null) image = rect.gameObject.AddComponent<Image>();
            image.color = background;
            var button = rect.GetComponent<Button>();
            if (button == null) button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            button.onClick.AddListener(delegate { if (onClick != null) onClick(); });
            var text = MakeText(rect, label, 16, FontStyle.Bold, ink, TextAnchor.MiddleCenter);
            Stretch(text.rectTransform);
            return button;
        }

        void WorldLabel(Transform parent, string value, Vector3 position, float size, Color color, bool billboard)
        {
            var go = new GameObject("Sign");
            go.transform.SetParent(parent, false);
            go.transform.position = position;
            var mesh = go.AddComponent<TextMesh>();
            mesh.text = value ?? "";
            mesh.anchor = TextAnchor.MiddleCenter;
            mesh.alignment = TextAlignment.Center;
            mesh.characterSize = size;
            mesh.fontSize = 64;
            mesh.color = color;
            mesh.font = _font;
            mesh.richText = false;
            if (_font != null) _font.RequestCharactersInTexture(mesh.text, 64, FontStyle.Normal);
            var renderer = go.GetComponent<MeshRenderer>();
            if (renderer != null) renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            if (billboard) _billboards.Add(go.transform);
        }

        void DynamicLabel(Transform parent, string value, Vector3 position)
        {
            var go = new GameObject("Sign");
            go.transform.SetParent(parent, false);
            go.transform.position = position;
            var mesh = go.AddComponent<TextMesh>();
            mesh.text = value ?? "";
            mesh.anchor = TextAnchor.MiddleCenter;
            mesh.alignment = TextAlignment.Center;
            mesh.characterSize = 0.032f;
            mesh.fontSize = 56;
            mesh.color = Hex(0xf7f9fb);
            mesh.font = _font;
            mesh.richText = false;
            if (_font != null) _font.RequestCharactersInTexture(mesh.text, 56, FontStyle.Normal);
            _dynamicLabels.Add(go.transform);
        }

        GameObject Box(Transform parent, string name, Vector3 pos, Vector3 scale, Color color, bool collide)
        {
            return Shape(parent, name, PrimitiveType.Cube, pos, scale, color, collide);
        }

        GameObject Shape(Transform parent, string name, PrimitiveType type, Vector3 pos, Vector3 scale, Color color, bool collide)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.position = pos;
            go.transform.localScale = scale;
            if (!collide) go.layer = 2;
            var renderer = go.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderer.sharedMaterial = Mat(color);
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows = false;
            }
            return go;
        }

        void Hot(Transform parent, string name, Vector3 pos, Vector3 scale)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.position = pos;
            var box = go.AddComponent<BoxCollider>();
            box.size = scale;
        }

        static void Beam(Transform parent, Vector3 a, Vector3 b, Color color)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = "Beam";
            go.transform.SetParent(parent, false);
            var delta = b - a;
            go.transform.position = (a + b) * 0.5f;
            if (delta.sqrMagnitude > 0.0001f) go.transform.rotation = Quaternion.LookRotation(delta);
            go.transform.localScale = new Vector3(0.035f, 0.035f, delta.magnitude);
            go.layer = 2;
            var renderer = go.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderer.sharedMaterial = Mat(color);
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
        }

        static PrimitiveType MeshFor(string kind)
        {
            if (kind == "person" || kind == "company") return PrimitiveType.Sphere;
            if (kind == "account" || kind == "money" || kind == "country") return PrimitiveType.Cylinder;
            return PrimitiveType.Cube;
        }

        static Vector3 MeshScale(string kind)
        {
            if (kind == "person" || kind == "company") return new Vector3(0.24f, 0.24f, 0.24f);
            if (kind == "account" || kind == "money" || kind == "country") return new Vector3(0.22f, 0.05f, 0.22f);
            return new Vector3(0.16f, 0.16f, 0.16f);
        }

        static Color NodeColor(string kind, bool hot)
        {
            if (hot) return Hex(0xd35b4a);
            if (kind == "person") return Hex(0x7eb6ff);
            if (kind == "company") return Hex(0xc9b6ff);
            if (kind == "address" || kind == "phone" || kind == "money") return Hex(0xf5a524);
            if (kind == "document") return Hex(0xe7eef7);
            return Hex(0x8fd0c6);
        }

        static Color Hex(int hex)
        {
            return new Color(((hex >> 16) & 255) / 255f, ((hex >> 8) & 255) / 255f, (hex & 255) / 255f, 1f);
        }

        static Material Mat(Color color)
        {
            var shader = Shader.Find("Unlit/Color");
            if (shader == null) shader = Shader.Find("Standard");
            var mat = new Material(shader);
            mat.color = color;
            return mat;
        }

        static void ClearChildren(Transform parent)
        {
            if (parent == null) return;
            for (var i = parent.childCount - 1; i >= 0; i--)
            {
                var child = parent.GetChild(i).gameObject;
                child.SetActive(false);
                child.transform.SetParent(null, false);
                Destroy(child);
            }
        }

        static RectTransform Pin(Transform parent, string name, float x, float y, float w, float h)
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

        static void Stretch(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }

        static RectTransform StretchNew(Transform parent, string name)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            Stretch(rect);
            return rect;
        }

        sealed class Stack
        {
            readonly RectTransform _parent;
            readonly float _width;
            readonly Font _font;
            public float Y = 12f;

            public Stack(RectTransform parent, float width, Font font)
            {
                _parent = parent;
                _width = width;
                _font = font;
            }

            public void Paragraph(string value, int size, FontStyle style, Color color)
            {
                var go = new GameObject("P", typeof(RectTransform));
                go.transform.SetParent(_parent, false);
                var rect = go.GetComponent<RectTransform>();
                rect.anchorMin = new Vector2(0f, 1f);
                rect.anchorMax = new Vector2(0f, 1f);
                rect.pivot = new Vector2(0f, 1f);
                var text = go.AddComponent<Text>();
                text.font = _font;
                text.fontSize = size;
                text.fontStyle = style;
                text.color = color;
                text.alignment = TextAnchor.UpperLeft;
                text.horizontalOverflow = HorizontalWrapMode.Wrap;
                text.verticalOverflow = VerticalWrapMode.Overflow;
                text.supportRichText = false;
                text.raycastTarget = false;
                text.text = value ?? "";
                rect.sizeDelta = new Vector2(_width, 10f);
                var height = text.preferredHeight;
                if (height < size) height = Mathf.Ceil((value ?? "").Length / 52f) * (size + 6f);
                height += 8f;
                rect.sizeDelta = new Vector2(_width, height);
                rect.anchoredPosition = new Vector2(16f, -Y);
                Y += height + 8f;
            }

            public void Button(string label, Color background, Color ink, Action onClick)
            {
                var go = new GameObject("B", typeof(RectTransform));
                go.transform.SetParent(_parent, false);
                var rect = go.GetComponent<RectTransform>();
                rect.anchorMin = new Vector2(0f, 1f);
                rect.anchorMax = new Vector2(0f, 1f);
                rect.pivot = new Vector2(0f, 1f);
                var image = go.AddComponent<Image>();
                image.color = background;
                var button = go.AddComponent<Button>();
                button.targetGraphic = image;
                button.onClick.AddListener(delegate { if (onClick != null) onClick(); });
                var textGo = new GameObject("T", typeof(RectTransform));
                textGo.transform.SetParent(go.transform, false);
                var textRect = textGo.GetComponent<RectTransform>();
                textRect.anchorMin = Vector2.zero;
                textRect.anchorMax = Vector2.one;
                textRect.offsetMin = new Vector2(12f, 8f);
                textRect.offsetMax = new Vector2(-12f, -8f);
                var text = textGo.AddComponent<Text>();
                text.font = _font;
                text.fontSize = 16;
                text.fontStyle = FontStyle.Bold;
                text.color = ink;
                text.alignment = TextAnchor.MiddleLeft;
                text.horizontalOverflow = HorizontalWrapMode.Wrap;
                text.verticalOverflow = VerticalWrapMode.Overflow;
                text.supportRichText = false;
                text.raycastTarget = false;
                text.text = label ?? "";
                var lines = 1;
                var raw = label ?? "";
                for (var c = 0; c < raw.Length; c++)
                {
                    if (raw[c] == '\n') lines++;
                }
                var height = Mathf.Max(52f, lines * 22f + 24f);
                rect.sizeDelta = new Vector2(_width, height);
                rect.anchoredPosition = new Vector2(16f, -Y);
                Y += height + 8f;
            }

            public void Choices(string[] labels, bool[] on, Action<int> click)
            {
                var gap = 8f;
                var w = (_width - gap * (labels.Length - 1)) / labels.Length;
                for (var i = 0; i < labels.Length; i++)
                {
                    var index = i;
                    var go = new GameObject("C", typeof(RectTransform));
                    go.transform.SetParent(_parent, false);
                    var rect = go.GetComponent<RectTransform>();
                    rect.anchorMin = new Vector2(0f, 1f);
                    rect.anchorMax = new Vector2(0f, 1f);
                    rect.pivot = new Vector2(0f, 1f);
                    rect.anchoredPosition = new Vector2(16f + i * (w + gap), -Y);
                    rect.sizeDelta = new Vector2(w, 40f);
                    var image = go.AddComponent<Image>();
                    image.color = on[i] ? Hex(0xf5a524) : Hex(0x1b3a56);
                    var button = go.AddComponent<Button>();
                    button.targetGraphic = image;
                    button.onClick.AddListener(delegate { if (click != null) click(index); });
                    var textGo = new GameObject("T", typeof(RectTransform));
                    textGo.transform.SetParent(go.transform, false);
                    var textRect = textGo.GetComponent<RectTransform>();
                    Stretch(textRect);
                    var text = textGo.AddComponent<Text>();
                    text.font = _font;
                    text.fontSize = 14;
                    text.fontStyle = FontStyle.Bold;
                    text.color = on[i] ? Hex(0x1a1204) : Color.white;
                    text.alignment = TextAnchor.MiddleCenter;
                    text.horizontalOverflow = HorizontalWrapMode.Wrap;
                    text.raycastTarget = false;
                    text.text = labels[i];
                }
                Y += 48f;
            }

            public InputField Note(string value, Action<string> changed)
            {
                var go = new GameObject("Note", typeof(RectTransform));
                go.transform.SetParent(_parent, false);
                var rect = go.GetComponent<RectTransform>();
                rect.anchorMin = new Vector2(0f, 1f);
                rect.anchorMax = new Vector2(0f, 1f);
                rect.pivot = new Vector2(0f, 1f);
                rect.anchoredPosition = new Vector2(16f, -Y);
                rect.sizeDelta = new Vector2(_width, 140f);
                var image = go.AddComponent<Image>();
                image.color = new Color(0.1f, 0.14f, 0.2f, 1f);
                var input = go.AddComponent<InputField>();
                var textGo = new GameObject("Text", typeof(RectTransform));
                textGo.transform.SetParent(go.transform, false);
                var textRect = textGo.GetComponent<RectTransform>();
                textRect.anchorMin = Vector2.zero;
                textRect.anchorMax = Vector2.one;
                textRect.offsetMin = new Vector2(10f, 8f);
                textRect.offsetMax = new Vector2(-10f, -8f);
                var text = textGo.AddComponent<Text>();
                text.font = _font;
                text.fontSize = 16;
                text.color = Color.white;
                text.alignment = TextAnchor.UpperLeft;
                text.horizontalOverflow = HorizontalWrapMode.Wrap;
                text.verticalOverflow = VerticalWrapMode.Overflow;
                text.supportRichText = false;
                input.textComponent = text;
                input.lineType = InputField.LineType.MultiLineNewline;
                input.characterLimit = 600;
                input.text = value ?? "";
                input.onValueChanged.AddListener(delegate(string next) { if (changed != null) changed(next); });
                Y += 148f;
                return input;
            }
        }
    }
}
