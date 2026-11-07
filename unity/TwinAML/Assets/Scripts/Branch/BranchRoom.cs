using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.Rendering;
using UnityEngine.UI;

namespace TwinAml
{
    /// <summary>
    /// Topic 3 greybox. One floor, about 22 m by 16 m, built when the scene runs.
    /// Built-in pipeline and uGUI, same as the rest of the room. The case script
    /// still decides the twin; this component only records what the trainee noticed.
    /// </summary>
    public sealed class BranchRoom : MonoBehaviour
    {
        const float DoorReach = 3.6f;
        const float PromptReach = 2.8f;

        static Shader _shader;
        static readonly Dictionary<int, Material> Paints = new Dictionary<int, Material>();

        GameObject _player;
        GameObject _client;
        CharacterController _body;
        Camera _cam;
        float _vy;
        bool _camReady;
        string _page = "";
        string _focus = "";
        string _choice = "";
        bool _tasks;
        bool _notesOpen;
        BranchHotspot _lit;
        Text _prompt;
        InputField _reason;
        GameObject _ui;

        public static void Enter()
        {
            var old = GameObject.Find("TwinAML.Branch");
            if (old != null)
            {
                var prior = old.GetComponent<BranchRoom>();
                if (prior != null) prior.SavePose();
                old.name = "TwinAML.Branch.Old";
                Destroy(old);
            }
            var go = new GameObject("TwinAML.Branch");
            go.AddComponent<BranchRoom>().Build();
        }

        public void SavePose()
        {
            if (_player == null) return;
            BranchProgress.Pose = _player.transform.position;
            BranchProgress.Yaw = _player.transform.eulerAngles.y;
            BranchProgress.HasPose = true;
        }

        void Build()
        {
            BranchProgress.MarkEntered();
            DressCamera();
            var world = new GameObject("World");
            world.transform.SetParent(transform, false);
            BuildShell(world.transform);
            BuildRooms(world.transform);
            BuildPeople();
            EnsureEvents();
            if (!BranchProgress.GuideDismissed) _page = "guide";
            RebuildUi();
        }

        void DressCamera()
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
            _cam.backgroundColor = new Color(0.62f, 0.72f, 0.80f);
            _cam.nearClipPlane = 0.08f;
            _cam.farClipPlane = 80f;
            _cam.fieldOfView = 58f;
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.78f, 0.82f, 0.86f);
            var lights = FindObjectsOfType<Light>();
            for (var i = 0; i < lights.Length; i++)
            {
                if (lights[i].type != LightType.Directional) continue;
                lights[i].intensity = 1.15f;
                lights[i].color = new Color(1f, 0.97f, 0.92f);
                lights[i].shadows = LightShadows.Soft;
            }
        }

        void BuildShell(Transform world)
        {
            Cube(world, "Floor", new Vector3(11f, 0.05f, 8f), new Vector3(23f, 0.2f, 17f), new Color(0.78f, 0.80f, 0.82f), true);
            Rug(world, "Rug.Lobby", new Vector3(4.7f, 0.17f, 3.2f), new Vector3(8.4f, 0.02f, 5.4f), new Color(0.86f, 0.88f, 0.90f));
            Rug(world, "Rug.Desk", new Vector3(15.5f, 0.17f, 3.7f), new Vector3(12.2f, 0.02f, 6.4f), new Color(0.80f, 0.84f, 0.88f));
            Rug(world, "Rug.Meeting", new Vector3(4.7f, 0.17f, 11f), new Vector3(8.4f, 0.02f, 8.6f), new Color(0.86f, 0.82f, 0.76f));
            Rug(world, "Rug.Files", new Vector3(12.1f, 0.17f, 11.5f), new Vector3(5.4f, 0.02f, 8f), new Color(0.84f, 0.80f, 0.72f));
            Rug(world, "Rug.Compliance", new Vector3(18.4f, 0.17f, 11.5f), new Vector3(6.4f, 0.02f, 8f), new Color(0.74f, 0.82f, 0.88f));

            var wall = new Color(0.93f, 0.94f, 0.95f);
            var trim = new Color(0.13f, 0.22f, 0.36f);
            Wall(world, 1.6f, 0.15f, 3.2f, 0.3f, wall);
            Wall(world, 13.6f, 0.15f, 16.8f, 0.3f, wall);
            Wall(world, 11f, 15.85f, 22f, 0.3f, wall);
            Wall(world, 0.15f, 8f, 0.3f, 16f, wall);
            Wall(world, 21.85f, 8f, 0.3f, 16f, wall);

            Wall(world, 1.85f, 6.2f, 3.1f, 0.2f, wall);
            Wall(world, 7.32f, 6.2f, 3.45f, 0.2f, wall);
            Wall(world, 10.3f, 7.15f, 2.2f, 0.2f, wall);
            Wall(world, 17.55f, 7.15f, 8.3f, 0.2f, wall);
            Wall(world, 9.2f, 1.25f, 0.2f, 1.9f, wall);
            Wall(world, 9.2f, 6.6f, 0.2f, 4.8f, wall);
            Wall(world, 9.2f, 13.35f, 0.2f, 4.7f, wall);
            Wall(world, 9.2f, 6.7f, 0.45f, 1.15f, wall);
            Wall(world, 15f, 8.68f, 0.2f, 3.05f, wall);
            Wall(world, 15f, 13.95f, 0.2f, 3.5f, wall);

            Rug(world, "Mat.Entry", new Vector3(4.2f, 0.18f, 0.7f), new Vector3(1.8f, 0.02f, 0.9f), trim);
            Rug(world, "Mat.Desk", new Vector3(9.2f, 0.18f, 3.3f), new Vector3(0.9f, 0.02f, 1.8f), trim);
            Rug(world, "Mat.Meet", new Vector3(4.5f, 0.18f, 6.2f), new Vector3(2f, 0.02f, 0.9f), trim);
            Rug(world, "Mat.Back", new Vector3(12.4f, 0.18f, 7.15f), new Vector3(1.8f, 0.02f, 0.9f), trim);
            Rug(world, "Mat.Side", new Vector3(9.2f, 0.18f, 10f), new Vector3(0.9f, 0.02f, 1.8f), trim);
            Rug(world, "Mat.Compliance", new Vector3(15f, 0.18f, 11.2f), new Vector3(0.9f, 0.02f, 1.8f), trim);

            Cube(world, "Window", new Vector3(6f, 2.1f, 15.62f), new Vector3(3.2f, 1.2f, 0.08f), new Color(0.55f, 0.72f, 0.82f), false);
            Cube(world, "Window.B", new Vector3(16f, 2.1f, 15.62f), new Vector3(3.2f, 1.2f, 0.08f), new Color(0.55f, 0.72f, 0.82f), false);

            Sign(world, BranchCopy.T("zone.lobby"), new Vector3(4.7f, 2.55f, 5.85f), new Vector3(4.7f, 2.55f, 3f));
            Sign(world, BranchCopy.T("zone.desk"), new Vector3(15.4f, 2.55f, 6.85f), new Vector3(15.4f, 2.55f, 3.5f));
            Sign(world, BranchCopy.T("zone.meeting"), new Vector3(4.7f, 2.55f, 6.55f), new Vector3(4.7f, 2.55f, 10f));
            Sign(world, BranchCopy.T("zone.files"), new Vector3(12.1f, 2.55f, 7.5f), new Vector3(12.1f, 2.55f, 11f));
            Sign(world, BranchCopy.T("zone.compliance"), new Vector3(18.2f, 2.55f, 7.5f), new Vector3(18.2f, 2.55f, 11f));
        }

        void BuildRooms(Transform world)
        {
            var wood = new Color(0.55f, 0.40f, 0.28f);
            var navy = new Color(0.13f, 0.22f, 0.36f);
            var paper = new Color(0.96f, 0.95f, 0.90f);
            var paperAlt = new Color(0.93f, 0.90f, 0.80f);
            var screen = new Color(0.18f, 0.42f, 0.58f);

            var lobby = Folder(world, "Lobby");
            Cube(lobby, "Kiosk", new Vector3(2.1f, 0.7f, 1.7f), new Vector3(0.55f, 1.1f, 0.45f), navy, true);
            Cube(lobby, "Screen", new Vector3(7.5f, 1.85f, 0.55f), new Vector3(1.5f, 0.85f, 0.08f), screen, true);
            Cube(lobby, "Chair.A", new Vector3(3.3f, 0.38f, 4.3f), new Vector3(0.55f, 0.45f, 0.55f), wood, true);
            Cube(lobby, "Chair.B", new Vector3(4.2f, 0.38f, 4.3f), new Vector3(0.55f, 0.45f, 0.55f), wood, true);
            Cube(lobby, "Chair.C", new Vector3(5.1f, 0.38f, 4.3f), new Vector3(0.55f, 0.45f, 0.55f), wood, true);

            var desk = Folder(world, "RelationshipDesk");
            Cube(desk, "Counter", new Vector3(15.7f, 0.65f, 4.75f), new Vector3(6.8f, 1f, 1.25f), wood, true);
            Cube(desk, "Stamp", new Vector3(13.1f, 1.22f, 4.35f), new Vector3(0.18f, 0.12f, 0.18f), new Color(0.65f, 0.18f, 0.16f), true);
            Cube(desk, "Scanner", new Vector3(13.7f, 1.28f, 4.35f), new Vector3(0.55f, 0.16f, 0.38f), new Color(0.25f, 0.28f, 0.32f), true);
            Cube(desk, "NameCard", new Vector3(19.3f, 1.2f, 4.4f), new Vector3(0.28f, 0.02f, 0.18f), paper, true);
            HotCube(desk, "Computer", new Vector3(18.7f, 1.45f, 4.4f), new Vector3(0.72f, 0.48f, 0.4f), screen, "computer", "spot.computer");
            for (var i = 0; i < BranchProgress.DocIds.Length; i++)
            {
                var id = BranchProgress.DocIds[i];
                var x = 13.55f + i * 0.62f;
                HotCube(desk, "Doc." + id, new Vector3(x, 1.28f, 5.05f), new Vector3(0.48f, 0.16f, 0.34f), i % 2 == 0 ? paper : paperAlt, "doc:" + id, "spot." + id);
            }

            var meeting = Folder(world, "MeetingRoom");
            Cube(meeting, "Table", new Vector3(4.8f, 0.55f, 10.6f), new Vector3(2.6f, 0.75f, 1.2f), wood, true);
            Cube(meeting, "Laptop", new Vector3(4.5f, 1.0f, 10.5f), new Vector3(0.42f, 0.06f, 0.3f), new Color(0.2f, 0.22f, 0.26f), true);
            Cube(meeting, "Cup", new Vector3(5.5f, 0.98f, 10.85f), new Vector3(0.12f, 0.14f, 0.12f), new Color(0.85f, 0.88f, 0.9f), true);
            Cube(meeting, "Seat.A", new Vector3(4.8f, 0.38f, 9.5f), new Vector3(0.55f, 0.45f, 0.55f), navy, true);
            Cube(meeting, "Seat.B", new Vector3(4.8f, 0.38f, 11.7f), new Vector3(0.55f, 0.45f, 0.55f), wood, true);
            HotCube(meeting, "Chart", new Vector3(0.48f, 1.7f, 11.2f), new Vector3(0.08f, 1.35f, 1.7f), new Color(0.96f, 0.97f, 0.98f), "structure", "spot.structure");

            var files = Folder(world, "FileRoom");
            Cube(files, "Cabinet.A", new Vector3(11.2f, 1.05f, 14.4f), new Vector3(1.1f, 1.8f, 0.55f), new Color(0.45f, 0.48f, 0.52f), true);
            Cube(files, "Cabinet.B", new Vector3(12.5f, 1.05f, 14.4f), new Vector3(1.1f, 1.8f, 0.55f), new Color(0.45f, 0.48f, 0.52f), true);
            Cube(files, "Cabinet.C", new Vector3(13.8f, 1.05f, 14.4f), new Vector3(1.1f, 1.8f, 0.55f), new Color(0.45f, 0.48f, 0.52f), true);
            HotCube(files, "Policy", new Vector3(12.2f, 1.15f, 12.6f), new Vector3(0.46f, 0.2f, 0.58f), new Color(0.2f, 0.35f, 0.58f), "policy", "spot.policy");

            var compliance = Folder(world, "ComplianceOffice");
            Cube(compliance, "Desk", new Vector3(18.6f, 0.6f, 13.6f), new Vector3(2.2f, 0.9f, 0.9f), wood, true);
            Cube(compliance, "Monitor", new Vector3(18.6f, 1.25f, 13.85f), new Vector3(0.7f, 0.42f, 0.08f), screen, true);
            Cube(compliance, "ReportButton", new Vector3(19.4f, 1.12f, 13.3f), new Vector3(0.22f, 0.12f, 0.22f), new Color(0.7f, 0.22f, 0.2f), true);
        }

        void BuildPeople()
        {
            var spawn = BranchProgress.HasPose ? BranchProgress.Pose : new Vector3(4.1f, 0.25f, 2.05f);
            var yaw = BranchProgress.HasPose ? BranchProgress.Yaw : 25f;
            _player = new GameObject("Player");
            _player.transform.SetParent(transform, false);
            _player.transform.position = spawn;
            _player.transform.rotation = Quaternion.Euler(0f, yaw, 0f);
            _body = _player.AddComponent<CharacterController>();
            _body.height = 1.7f;
            _body.radius = 0.32f;
            _body.center = new Vector3(0f, 0.9f, 0f);
            _body.stepOffset = 0.2f;
            _body.skinWidth = 0.05f;
            var shirt = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            shirt.name = "Body";
            shirt.transform.SetParent(_player.transform, false);
            shirt.transform.localPosition = new Vector3(0f, 0.9f, 0f);
            shirt.transform.localScale = new Vector3(0.6f, 0.84f, 0.6f);
            Destroy(shirt.GetComponent<Collider>());
            shirt.GetComponent<Renderer>().sharedMaterial = Paint(new Color(0.18f, 0.40f, 0.72f));
            Head(_player.transform, new Color(0.93f, 0.8f, 0.7f));

            _client = Person("Client", ClientFeet(BranchProgress.ClientStop), new Color(0.25f, 0.35f, 0.48f), "client", "spot.client", ClientYaw(BranchProgress.ClientStop));
            Person("Compliance", new Vector3(17.4f, 0.16f, 12.3f), new Color(0.32f, 0.38f, 0.46f), "decision", "spot.decision", 140f);
        }

        GameObject Person(string name, Vector3 feet, Color color, string hotspot, string prompt, float yaw)
        {
            var root = new GameObject(name);
            root.transform.SetParent(transform, false);
            root.transform.position = feet;
            root.transform.rotation = Quaternion.Euler(0f, yaw, 0f);
            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "Body";
            body.transform.SetParent(root.transform, false);
            body.transform.localPosition = new Vector3(0f, 0.9f, 0f);
            body.transform.localScale = new Vector3(0.62f, 0.86f, 0.62f);
            body.GetComponent<Renderer>().sharedMaterial = Paint(color);
            var spot = body.AddComponent<BranchHotspot>();
            spot.HotspotId = hotspot;
            spot.PromptKey = prompt;
            spot.Remember();
            Head(root.transform, new Color(0.93f, 0.8f, 0.7f));
            Sign(root.transform, BranchCopy.T(prompt), new Vector3(0f, 2.05f, 0f), new Vector3(0f, 2.05f, 1.2f));
            return root;
        }

        static void Head(Transform parent, Color color)
        {
            var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            head.name = "Head";
            head.transform.SetParent(parent, false);
            head.transform.localPosition = new Vector3(0f, 1.62f, 0f);
            head.transform.localScale = new Vector3(0.28f, 0.28f, 0.28f);
            Destroy(head.GetComponent<Collider>());
            head.GetComponent<Renderer>().sharedMaterial = Paint(color);
        }

        void Update()
        {
            var typing = _reason != null && _reason.isFocused;
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                _page = _page == "" ? "pause" : _page == "pause" ? "" : "";
                RebuildUi();
                return;
            }
            if (!typing && _page == "" && Input.GetKeyDown(KeyCode.Tab))
            {
                _tasks = !_tasks;
                RebuildUi();
                return;
            }
            if (!typing && _page == "" && Input.GetKeyDown(KeyCode.I))
            {
                _notesOpen = !_notesOpen;
                RebuildUi();
                return;
            }

            if (_player != null && _player.transform.position.y < -1.5f)
                _player.transform.position = new Vector3(4.1f, 0.4f, 2.05f);

            if (_page == "" && _body != null && _cam != null)
            {
                var forward = _cam.transform.forward;
                forward.y = 0f;
                if (forward.sqrMagnitude < 0.001f) forward = Vector3.forward;
                forward.Normalize();
                var right = _cam.transform.right;
                right.y = 0f;
                right.Normalize();
                var wish = right * Input.GetAxisRaw("Horizontal") + forward * Input.GetAxisRaw("Vertical");
                if (wish.sqrMagnitude > 1f) wish.Normalize();
                if (wish.sqrMagnitude > 0.01f)
                {
                    var face = Quaternion.LookRotation(wish);
                    _player.transform.rotation = Quaternion.Slerp(_player.transform.rotation, face, 12f * Time.deltaTime);
                }
                if (_body.isGrounded && _vy < 0f) _vy = -1.5f;
                else _vy -= 18f * Time.deltaTime;
                var motion = wish * 3.1f;
                motion.y = _vy;
                _body.Move(motion * Time.deltaTime);
            }

            if (_client != null)
            {
                var feet = ClientFeet(BranchProgress.ClientStop);
                _client.transform.position = Vector3.Lerp(_client.transform.position, feet, 1f - Mathf.Exp(-3.2f * Time.deltaTime));
                var face = Quaternion.Euler(0f, ClientYaw(BranchProgress.ClientStop), 0f);
                _client.transform.rotation = Quaternion.Slerp(_client.transform.rotation, face, 4f * Time.deltaTime);
            }

            var near = _page == "" ? Nearest() : null;
            if (_lit != near)
            {
                if (_lit != null) _lit.SetLit(false);
                _lit = near;
                if (_lit != null) _lit.SetLit(true);
            }
            if (_prompt != null)
                _prompt.text = near == null ? BranchCopy.T("hud.controls") : BranchCopy.T("hud.use") + "  ·  " + BranchCopy.T(near.PromptKey);

            if (_page != "" || _cam == null) return;
            if (Input.GetKeyDown(KeyCode.E) && near != null) Open(near.HotspotId);
            if (Input.GetMouseButtonDown(0) && !OverUi())
            {
                RaycastHit hit;
                if (Physics.Raycast(_cam.ScreenPointToRay(Input.mousePosition), out hit, 12f))
                {
                    var spot = hit.collider.GetComponentInParent<BranchHotspot>();
                    if (spot != null && hit.distance <= DoorReach) Open(spot.HotspotId);
                }
            }
        }

        void LateUpdate()
        {
            if (_cam == null || _player == null) return;
            var desired = _player.transform.position - _player.transform.forward * 5.1f + Vector3.up * 3.35f;
            if (!_camReady)
            {
                _cam.transform.position = desired;
                _camReady = true;
            }
            else
            {
                var t = 1f - Mathf.Exp(-5f * Time.deltaTime);
                _cam.transform.position = Vector3.Lerp(_cam.transform.position, desired, t);
            }
            _cam.transform.LookAt(_player.transform.position + Vector3.up * 1.15f);
        }

        BranchHotspot Nearest()
        {
            if (_player == null) return null;
            var spots = GetComponentsInChildren<BranchHotspot>();
            BranchHotspot best = null;
            var bestDistance = PromptReach;
            for (var i = 0; i < spots.Length; i++)
            {
                var distance = Vector3.Distance(_player.transform.position, spots[i].transform.position);
                if (distance >= bestDistance) continue;
                bestDistance = distance;
                best = spots[i];
            }
            return best;
        }

        void Open(string id)
        {
            _focus = "";
            if (id == "client")
            {
                if (BranchProgress.ClientStop >= 2) _page = "interview";
                else if (BranchProgress.ClientStop == 1) _page = "desk";
                else _page = "greet";
            }
            else if (id == "computer")
            {
                BranchProgress.SawComputer = true;
                _page = "computer";
            }
            else if (id == "policy")
            {
                BranchProgress.ReadPolicy = true;
                _page = "policy";
            }
            else if (id == "structure")
            {
                _page = "structure";
                _focus = "starlight";
            }
            else if (id == "decision")
            {
                _page = "decide";
                if (!BranchProgress.ClockArmed && FlowController.Instance != null)
                {
                    FlowController.Instance.ArmChoiceClock();
                    BranchProgress.ClockArmed = true;
                }
            }
            else if (id.StartsWith("doc:"))
            {
                _focus = id.Substring(4);
                BranchProgress.Reviewed.Add(_focus);
                _page = "doc";
            }
            RebuildUi();
        }

        void EnsureEvents()
        {
            if (FindObjectOfType<EventSystem>() != null) return;
            var events = new GameObject("TwinAML.EventSystem");
            events.transform.SetParent(transform, false);
            events.AddComponent<EventSystem>();
            events.AddComponent<StandaloneInputModule>();
        }

        void RebuildUi()
        {
            _reason = null;
            _prompt = null;
            if (_ui != null)
            {
                _ui.name = "UI.Old";
                Destroy(_ui);
                _ui = null;
            }
            _ui = new GameObject("TwinAML.BranchUI");
            _ui.transform.SetParent(transform, false);
            var canvas = _ui.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 20;
            var scaler = _ui.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
            _ui.AddComponent<GraphicRaycaster>();

            var bar = HudBox(_ui.transform, 0f, 0f, 1920f, 64f);
            bar.gameObject.AddComponent<Image>().color = UiKit.Header;
            Label(bar, BranchCopy.T("hud.synthetic"), 18, FontStyle.Bold, UiKit.White, TextAnchor.MiddleLeft, 24f, 8f, 900f, 48f);
            HudButton(bar, BranchCopy.T("hud.words"), 1188f, 12f, 160f, 40f, UiKit.Slate, () =>
            {
                _page = "words";
                RebuildUi();
            });
            HudButton(bar, BranchCopy.T("hud.tasks"), 1360f, 12f, 160f, 40f, UiKit.Soft, () =>
            {
                _tasks = !_tasks;
                RebuildUi();
            });
            HudButton(bar, BranchCopy.T("hud.notes"), 1532f, 12f, 160f, 40f, UiKit.Soft, () =>
            {
                _notesOpen = !_notesOpen;
                RebuildUi();
            });
            HudButton(bar, BranchCopy.T("hud.pause"), 1704f, 12f, 184f, 40f, UiKit.Soft, () =>
            {
                _page = "pause";
                RebuildUi();
            });

            if (_page == "")
            {
                var coach = HudBox(_ui.transform, 24f, 76f, 1872f, 132f);
                coach.gameObject.AddComponent<Image>().color = new Color(1f, 0.97f, 0.90f, 0.96f);
                Label(coach, BranchCopy.T("hud.next") + "   ·   " + ZoneName() + "   " + Clock(), 16, FontStyle.Bold, UiKit.OrangeInk, TextAnchor.MiddleLeft, 20f, 10f, 1830f, 28f);
                Label(coach, BranchCopy.T(BranchProgress.CoachKey()), 20, FontStyle.Normal, UiKit.Ink, TextAnchor.UpperLeft, 20f, 42f, 1830f, 80f);
            }

            var prompt = HudBox(_ui.transform, 360f, 1000f, 1200f, 56f);
            prompt.gameObject.AddComponent<Image>().color = new Color(0.08f, 0.12f, 0.18f, 0.82f);
            _prompt = Label(prompt, "", 20, FontStyle.Bold, UiKit.White, TextAnchor.MiddleCenter, 12f, 6f, 1176f, 44f);

            if (_tasks) TaskCard();
            if (_notesOpen) NotesCard();
            if (_page != "") BuildModal();
        }

        void TaskCard()
        {
            var card = HudBox(_ui.transform, 24f, 220f, 460f, 280f);
            card.gameObject.AddComponent<Image>().color = UiKit.Card;
            var y = 16f;
            Label(card, BranchCopy.T("hud.tasks"), 20, FontStyle.Bold, UiKit.Ink, TextAnchor.MiddleLeft, 18f, y, 420f, 32f);
            y = 56f;
            y = TaskLine(card, BranchProgress.ClientStop > 0 || BranchProgress.Asked.Contains("service"), "task.greet", y);
            y = TaskLine(card, BranchProgress.Reviewed.Count >= BranchProgress.DocIds.Length, "task.docs", y);
            y = TaskLine(card, BranchProgress.Asked.Contains("sof") && BranchProgress.Asked.Contains("ubo") && BranchProgress.Asked.Contains("volume") && BranchProgress.Asked.Contains("authority"), "task.ask", y);
            y = TaskLine(card, BranchProgress.UboMarked, "task.ubo", y);
            y = TaskLine(card, BranchProgress.Marked.Contains("sof") || BranchProgress.Asked.Contains("sof"), "task.funds", y);
            TaskLine(card, false, "task.decide", y);
        }

        float TaskLine(RectTransform card, bool done, string key, float y)
        {
            var mark = done ? "✓  " : "·  ";
            Label(card, mark + BranchCopy.T(key), 16, FontStyle.Normal, done ? UiKit.Pass : UiKit.Ink, TextAnchor.MiddleLeft, 18f, y, 424f, 32f);
            return y + 34f;
        }

        void NotesCard()
        {
            var card = HudBox(_ui.transform, 1436f, 220f, 460f, 360f);
            card.gameObject.AddComponent<Image>().color = UiKit.Card;
            Label(card, BranchCopy.T("hud.notes"), 20, FontStyle.Bold, UiKit.Ink, TextAnchor.MiddleLeft, 18f, 16f, 424f, 32f);
            var body = NotesText();
            Label(card, body, 16, FontStyle.Normal, UiKit.Ink, TextAnchor.UpperLeft, 18f, 56f, 424f, 286f);
        }

        string NotesText()
        {
            var lines = new List<string>();
            for (var i = 0; i < BranchProgress.DocIds.Length; i++)
            {
                var id = BranchProgress.DocIds[i];
                if (!BranchProgress.Reviewed.Contains(id) && !BranchProgress.Supplement.Contains(id)) continue;
                var issue = BranchProgress.IssueFor(id);
                var marked = issue != "" && BranchProgress.Marked.Contains(issue);
                if (issue == "" && BranchProgress.Wrong.Contains(id)) marked = true;
                var line = BranchCopy.T("spot." + id);
                if (marked) line += "  ·  " + BranchCopy.T("notes.marked");
                if (BranchProgress.Supplement.Contains(id)) line += "  ·  " + BranchCopy.T("notes.supplement");
                lines.Add(line);
            }
            if (BranchProgress.UboMarked) lines.Add(BranchCopy.T("node.marked"));
            for (var i = 0; i < BranchProgress.Notes.Count; i++) lines.Add(BranchProgress.Notes[i]);
            if (lines.Count == 0) return BranchCopy.T("notes.empty");
            return string.Join("\n", lines.ToArray());
        }

        void BuildModal()
        {
            var dim = HudBox(_ui.transform, 0f, 0f, 1920f, 1080f);
            var dimImage = dim.gameObject.AddComponent<Image>();
            dimImage.color = new Color(0.05f, 0.08f, 0.12f, 0.5f);
            var panelGo = new GameObject("Modal", typeof(RectTransform));
            panelGo.transform.SetParent(_ui.transform, false);
            var panel = panelGo.GetComponent<RectTransform>();
            panel.anchorMin = new Vector2(0.5f, 0.5f);
            panel.anchorMax = new Vector2(0.5f, 0.5f);
            panel.pivot = new Vector2(0.5f, 0.5f);
            var tall = _page == "guide" || _page == "words" || _page == "decide" || _page == "policy" || _page == "structure" || _page == "interview";
            panel.sizeDelta = new Vector2(1040f, tall ? 1000f : 860f);
            panelGo.AddComponent<Image>().color = UiKit.Card;

            if (_page == "guide") PageGuide(panel);
            else if (_page == "words") PageWords(panel);
            else if (_page == "greet") PageGreet(panel);
            else if (_page == "greet-answer") PageAnswer(panel, "greet.a." + _focus, "greet");
            else if (_page == "greet-warn") PageWarn(panel);
            else if (_page == "desk") PageDesk(panel);
            else if (_page == "interview") PageInterview(panel);
            else if (_page == "interview-answer") PageAnswer(panel, "ask." + _focus + ".reply", "interview");
            else if (_page == "doc") PageDoc(panel);
            else if (_page == "computer") PageLong(panel, BranchCopy.T("spot.computer"), BranchCopy.T("computer.body"));
            else if (_page == "policy") PageLong(panel, BranchCopy.T("spot.policy"), BranchCopy.T("policy.body"));
            else if (_page == "structure") PageStructure(panel);
            else if (_page == "decide") PageDecide(panel);
            else if (_page == "decide-confirm") PageConfirm(panel);
            else if (_page == "pause") PagePause(panel);
        }

        void PageGuide(RectTransform panel)
        {
            var y = Title(panel, BranchCopy.T("guide.title"), 24f);
            Body(panel, BranchCopy.T("guide.body"), y, 760f);
            ModalButton(panel, BranchCopy.T("guide.start"), 48f, 900f, 944f, 52f, UiKit.Slate, UiKit.White, () =>
            {
                BranchProgress.GuideDismissed = true;
                _page = "";
                RebuildUi();
            });
        }

        void PageWords(RectTransform panel)
        {
            var y = Title(panel, BranchCopy.T("words.title"), 24f);
            Body(panel, BranchCopy.T("words.body"), y, 800f);
            CloseButton(panel);
        }

        void PageGreet(RectTransform panel)
        {
            var y = Title(panel, BranchCopy.T("spot.client"), 24f);
            y = Body(panel, BranchCopy.T("greet.lead"), y, 72f);
            y = Ask(panel, "service", "greet.q.service", y, true);
            y = Ask(panel, "company", "greet.q.company", y, true);
            y = Ask(panel, "business", "greet.q.business", y, true);
            y = Ask(panel, "volume", "greet.q.volume", y, true);
            ModalButton(panel, BranchCopy.T("greet.invite"), 48f, y, 944f, 48f, UiKit.Slate, UiKit.White, Invite);
        }

        float Ask(RectTransform panel, string id, string key, float y, bool greet)
        {
            var asked = BranchProgress.Asked.Contains(id);
            var label = (asked ? "✓  " : "") + BranchCopy.T(key);
            ModalButton(panel, label, 48f, y, 944f, 46f, asked ? UiKit.Soft : UiKit.Slot, UiKit.Ink, () =>
            {
                BranchProgress.Asked.Add(id);
                _focus = id;
                _page = greet ? "greet-answer" : "interview-answer";
                RebuildUi();
            });
            return y + 54f;
        }

        void PageAnswer(RectTransform panel, string bodyKey, string back)
        {
            var y = Title(panel, BranchCopy.T("spot.client"), 24f);
            y = Body(panel, BranchCopy.T(bodyKey), y, 160f);
            var why = back == "greet" ? "greet.why." + _focus : "ask." + _focus + ".why";
            Body(panel, BranchCopy.T(why), y, 140f);
            ModalButton(panel, BranchCopy.T("hud.back"), 48f, 760f, 944f, 48f, UiKit.Slate, UiKit.White, () =>
            {
                _page = back;
                RebuildUi();
            });
        }

        void PageWarn(RectTransform panel)
        {
            var y = Title(panel, BranchCopy.T("spot.client"), 24f);
            Body(panel, BranchCopy.T("greet.warn"), y, 140f);
            ModalButton(panel, BranchCopy.T("greet.go"), 48f, 280f, 944f, 48f, UiKit.Orange, UiKit.OrangeInk, () => MoveClient(1));
            ModalButton(panel, BranchCopy.T("hud.back"), 48f, 340f, 944f, 48f, UiKit.Soft, UiKit.Ink, () =>
            {
                _page = "greet";
                RebuildUi();
            });
        }

        void PageDesk(RectTransform panel)
        {
            var y = Title(panel, BranchCopy.T("spot.client"), 24f);
            Body(panel, BranchCopy.T("desk.lead"), y, 120f);
            ModalButton(panel, BranchCopy.T("desk.move"), 48f, 240f, 944f, 48f, UiKit.Slate, UiKit.White, () => MoveClient(2));
            CloseButton(panel);
        }

        void PageInterview(RectTransform panel)
        {
            var y = Title(panel, BranchCopy.T("spot.client"), 24f);
            y = Body(panel, BranchCopy.T("ask.lead"), y, 64f);
            y = Tagged(panel, "customers", "tag.recommended", y);
            y = Tagged(panel, "sof", "tag.must", y);
            y = Tagged(panel, "ubo", "tag.must", y);
            y = Tagged(panel, "volume", "tag.must", y);
            y = Tagged(panel, "geo", "tag.recommended", y);
            y = Tagged(panel, "authority", "tag.must", y);
            Tagged(panel, "skip", "tag.bad", y);
            CloseButton(panel);
        }

        float Tagged(RectTransform panel, string id, string tag, float y)
        {
            var asked = BranchProgress.Asked.Contains(id);
            var label = (asked ? "✓  " : "") + BranchCopy.T(tag) + "  ·  " + BranchCopy.T("ask." + id);
            var bg = id == "skip" ? new Color32(0xfb, 0xee, 0xee, 0xff) : asked ? UiKit.Soft : UiKit.Slot;
            ModalButton(panel, label, 48f, y, 944f, 44f, bg, UiKit.Ink, () =>
            {
                BranchProgress.Asked.Add(id);
                _focus = id;
                _page = "interview-answer";
                RebuildUi();
            });
            return y + 50f;
        }

        void PageDoc(RectTransform panel)
        {
            var issue = BranchProgress.IssueFor(_focus);
            var y = Title(panel, BranchCopy.T("spot." + _focus), 24f);
            y = Body(panel, BranchCopy.T("teach." + _focus), y, 88f);
            y = Body(panel, BranchCopy.T("doc." + _focus + ".body"), y, 130f);
            var marked = issue != "" && BranchProgress.Marked.Contains(issue);
            if (issue == "" && BranchProgress.Wrong.Contains(_focus)) marked = true;
            var status = BranchCopy.T("notes.reviewed");
            if (marked) status += "  ·  " + BranchCopy.T("notes.marked");
            if (BranchProgress.Supplement.Contains(_focus)) status += "  ·  " + BranchCopy.T("notes.supplement");
            if (issue != "" && marked) status += "\n" + BranchCopy.T("issue." + issue + ".title");
            y = Body(panel, status, y, 64f);
            ModalButton(panel, BranchCopy.T(marked ? "hud.unmark" : "hud.mark"), 48f, y, 460f, 46f, UiKit.Orange, UiKit.OrangeInk, ToggleMark);
            ModalButton(panel, BranchCopy.T("hud.supplement"), 528f, y, 464f, 46f, UiKit.Soft, UiKit.Ink, () =>
            {
                if (!BranchProgress.Supplement.Add(_focus)) BranchProgress.Supplement.Remove(_focus);
                RebuildUi();
            });
            y += 56f;
            ModalButton(panel, BranchCopy.T("hud.hint"), 48f, y, 460f, 46f, UiKit.Soft, UiKit.Ink, DocHint);
            ModalButton(panel, BranchCopy.T("hud.note"), 528f, y, 464f, 46f, UiKit.Soft, UiKit.Ink, () =>
            {
                var line = BranchCopy.T("spot." + _focus);
                if (!BranchProgress.Notes.Contains(line)) BranchProgress.Notes.Add(line);
                RebuildUi();
            });
            CloseButton(panel);
        }

        void ToggleMark()
        {
            var issue = BranchProgress.IssueFor(_focus);
            if (issue == "")
            {
                if (!BranchProgress.Wrong.Add(_focus)) BranchProgress.Wrong.Remove(_focus);
            }
            else if (!BranchProgress.Marked.Add(issue))
            {
                BranchProgress.Marked.Remove(issue);
            }
            RebuildUi();
        }

        void DocHint()
        {
            var issue = BranchProgress.IssueFor(_focus);
            if (issue == "")
            {
                if (!BranchProgress.Notes.Contains(BranchCopy.T("hint.none")))
                    BranchProgress.Notes.Add(BranchCopy.T("hint.none"));
            }
            else
            {
                BranchProgress.Hints++;
                var line = BranchCopy.T("hint.spent") + "  " + BranchCopy.T("issue." + issue + ".title");
                if (!BranchProgress.Notes.Contains(line)) BranchProgress.Notes.Add(line);
            }
            RebuildUi();
        }

        void PageLong(RectTransform panel, string title, string body)
        {
            var y = Title(panel, title, 24f);
            Body(panel, body, y, 620f);
            CloseButton(panel);
        }

        void PageStructure(RectTransform panel)
        {
            var y = Title(panel, BranchCopy.T("spot.structure"), 24f);
            y = Body(panel, BranchCopy.T("structure.lead"), y, 72f);
            y = Body(panel, ChainLine(), y, 40f);
            y = NodeButton(panel, "starlight", y);
            if (BranchProgress.NodeVisible("li")) y = NodeButton(panel, "li", y);
            if (BranchProgress.NodeVisible("bvi")) y = NodeButton(panel, "bvi", y);
            if (BranchProgress.NodeVisible("seychelles")) y = NodeButton(panel, "seychelles", y);
            if (BranchProgress.NodeVisible("mr_a")) y = NodeButton(panel, "mr_a", y);
            y = Body(panel, BranchCopy.T("node." + (_focus == "" ? "starlight" : _focus)), y, 110f);
            if (BranchProgress.NodeVisible("mr_a"))
            {
                ModalButton(panel, BranchCopy.T(BranchProgress.UboMarked ? "node.marked" : "node.mark"), 48f, y, 944f, 44f, UiKit.Orange, UiKit.OrangeInk, () =>
                {
                    BranchProgress.UboMarked = true;
                    RebuildUi();
                });
                y += 52f;
            }
            ModalButton(panel, BranchCopy.T("hud.hint"), 48f, y, 460f, 44f, UiKit.Soft, UiKit.Ink, () =>
            {
                if (!BranchProgress.RevealNext() && !BranchProgress.Notes.Contains(BranchCopy.T("hint.done")))
                    BranchProgress.Notes.Add(BranchCopy.T("hint.done"));
                if (BranchProgress.NodeVisible("mr_a")) _focus = "mr_a";
                RebuildUi();
            });
            CloseButton(panel);
        }

        float NodeButton(RectTransform panel, string id, float y)
        {
            var on = _focus == id;
            ModalButton(panel, BranchCopy.T("node." + id + ".name"), 48f, y, 944f, 40f, on ? UiKit.Slate : UiKit.Slot, on ? UiKit.White : UiKit.Ink, () =>
            {
                BranchProgress.Opened.Add(id);
                _focus = id;
                RebuildUi();
            });
            return y + 46f;
        }

        void PageDecide(RectTransform panel)
        {
            var y = Title(panel, BranchCopy.T("zone.compliance"), 24f);
            y = Body(panel, BranchCopy.T("decide.lead"), y, 56f);
            y = Body(panel, BranchCopy.T("decide.help"), y, 280f);
            var gap = BranchProgress.GapLine();
            if (gap != "") y = Body(panel, gap, y, 88f);
            y = DecideButton(panel, "open_account", "decide.open", y);
            y = DecideButton(panel, "request_documents", "decide.docs", y);
            y = DecideButton(panel, "order_edd", "decide.edd", y);
            y = DecideButton(panel, "report_compliance", "decide.report", y);
            DecideButton(panel, "refuse_onboarding", "decide.refuse", y);
            CloseButton(panel);
        }

        float DecideButton(RectTransform panel, string id, string key, float y)
        {
            ModalButton(panel, BranchCopy.T(key), 48f, y, 944f, 48f, UiKit.Slot, UiKit.Ink, () =>
            {
                _choice = id;
                _page = "decide-confirm";
                RebuildUi();
            });
            return y + 56f;
        }

        void PageConfirm(RectTransform panel)
        {
            var y = Title(panel, BranchProgress.ActionLabel(_choice), 24f);
            y = Body(panel, BranchCopy.T("decide.confirm"), y, 56f);
            Label(panel, BranchCopy.T("hud.reason"), 16, FontStyle.Bold, UiKit.Muted, TextAnchor.MiddleLeft, 48f, y, 944f, 28f);
            y += 32f;
            var field = PanelBox(panel, 48f, y, 944f, 110f);
            field.gameObject.AddComponent<Image>().color = UiKit.Slot;
            var textGo = new GameObject("Text", typeof(RectTransform));
            textGo.transform.SetParent(field, false);
            var textRect = textGo.GetComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = new Vector2(12f, 8f);
            textRect.offsetMax = new Vector2(-12f, -8f);
            var text = textGo.AddComponent<Text>();
            text.font = UiKit.Font;
            text.fontSize = 18;
            text.color = UiKit.Ink;
            text.alignment = TextAnchor.UpperLeft;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.supportRichText = false;
            var input = field.gameObject.AddComponent<InputField>();
            input.textComponent = text;
            input.lineType = InputField.LineType.MultiLineNewline;
            input.characterLimit = 240;
            input.text = BranchProgress.Reason ?? "";
            _reason = input;
            ModalButton(panel, BranchCopy.T("hud.submit"), 48f, 700f, 460f, 48f, UiKit.Slate, UiKit.White, Submit);
            ModalButton(panel, BranchCopy.T("hud.back"), 528f, 700f, 464f, 48f, UiKit.Soft, UiKit.Ink, () =>
            {
                if (_reason != null) BranchProgress.Reason = _reason.text ?? "";
                _page = "decide";
                RebuildUi();
            });
        }

        void PagePause(RectTransform panel)
        {
            var y = Title(panel, BranchCopy.T("hud.pause"), 24f);
            Body(panel, BranchCopy.T("pause.lead") + "\n\n" + BranchCopy.T("hud.controls"), y, 140f);
            ModalButton(panel, BranchCopy.T("pause.resume"), 48f, 280f, 944f, 48f, UiKit.Slate, UiKit.White, () =>
            {
                _page = "";
                RebuildUi();
            });
            ModalButton(panel, BranchCopy.T("pause.hub"), 48f, 340f, 944f, 48f, UiKit.Soft, UiKit.Ink, () =>
            {
                var flow = FlowController.Instance;
                if (flow != null) flow.Go(SceneId.Scn_TopicsHub);
            });
        }

        void Invite()
        {
            if (!BranchProgress.Asked.Contains("service") || !BranchProgress.Asked.Contains("volume"))
            {
                _page = "greet-warn";
                RebuildUi();
                return;
            }
            MoveClient(1);
        }

        void MoveClient(int stop)
        {
            BranchProgress.ClientStop = stop;
            _page = "";
            RebuildUi();
        }

        void Submit()
        {
            if (_reason != null) BranchProgress.Reason = _reason.text ?? "";
            var flow = FlowController.Instance;
            if (flow != null) flow.Commit(_choice);
        }

        void CloseButton(RectTransform panel)
        {
            var y = _page == "words" || _page == "decide" || _page == "policy" || _page == "structure" || _page == "interview" ? 920f : 792f;
            ModalButton(panel, BranchCopy.T("hud.close"), 48f, y, 944f, 44f, UiKit.Soft, UiKit.Ink, () =>
            {
                _page = "";
                RebuildUi();
            });
        }

        float Title(RectTransform panel, string text, float y)
        {
            Label(panel, text, 26, FontStyle.Bold, UiKit.Ink, TextAnchor.MiddleLeft, 48f, y, 944f, 40f);
            return y + 48f;
        }

        float Body(RectTransform panel, string text, float y, float height)
        {
            var box = PanelBox(panel, 48f, y, 944f, height);
            box.gameObject.AddComponent<RectMask2D>();
            Label(box, text, 18, FontStyle.Normal, UiKit.Ink, TextAnchor.UpperLeft, 0f, 0f, 944f, height);
            return y + height + 12f;
        }

        string ChainLine()
        {
            var parts = new List<string>();
            parts.Add(BranchCopy.T("node.starlight.name"));
            parts.Add(BranchProgress.NodeVisible("bvi") ? BranchCopy.T("node.bvi.name") : "…");
            if (BranchProgress.NodeVisible("bvi"))
                parts.Add(BranchProgress.NodeVisible("seychelles") ? BranchCopy.T("node.seychelles.name") : "…");
            if (BranchProgress.NodeVisible("seychelles"))
                parts.Add(BranchProgress.NodeVisible("mr_a") ? BranchCopy.T("node.mr_a.name") : "…");
            return string.Join("   →   ", parts.ToArray());
        }

        string ZoneName()
        {
            if (_player == null) return BranchCopy.T("zone.lobby");
            var p = _player.transform.position;
            if (p.x < 9.2f && p.z < 6.2f) return BranchCopy.T("zone.lobby");
            if (p.x >= 9.2f && p.z < 7.15f) return BranchCopy.T("zone.desk");
            if (p.x < 9.2f) return BranchCopy.T("zone.meeting");
            if (p.x < 15f) return BranchCopy.T("zone.files");
            return BranchCopy.T("zone.compliance");
        }

        string Clock()
        {
            var total = Mathf.Max(0, BranchProgress.ElapsedMs() / 1000);
            return (total / 60) + ":" + (total % 60).ToString("00");
        }

        static Vector3 ClientFeet(int stop)
        {
            if (stop <= 0) return new Vector3(6.4f, 0.16f, 3.5f);
            if (stop == 1) return new Vector3(13.6f, 0.16f, 3.55f);
            return new Vector3(6.3f, 0.16f, 10.5f);
        }

        static float ClientYaw(int stop)
        {
            if (stop <= 0) return 200f;
            if (stop == 1) return 250f;
            return 20f;
        }

        static bool OverUi()
        {
            return EventSystem.current != null && EventSystem.current.IsPointerOverGameObject();
        }

        static Transform Folder(Transform parent, string name)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            return go.transform;
        }

        static void Wall(Transform parent, float x, float z, float width, float depth, Color color)
        {
            Cube(parent, "Wall", new Vector3(x, 1.6f, z), new Vector3(width, 3.2f, depth), color, true);
        }

        static void Rug(Transform parent, string name, Vector3 pos, Vector3 scale, Color color)
        {
            Cube(parent, name, pos, scale, color, false);
        }

        static GameObject Cube(Transform parent, string name, Vector3 pos, Vector3 scale, Color color, bool solid)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.position = pos;
            go.transform.localScale = scale;
            go.GetComponent<Renderer>().sharedMaterial = Paint(color);
            if (!solid)
            {
                var collider = go.GetComponent<Collider>();
                if (collider != null) Destroy(collider);
            }
            return go;
        }

        static void HotCube(Transform parent, string name, Vector3 pos, Vector3 scale, Color color, string id, string prompt)
        {
            var go = Cube(parent, name, pos, scale, color, true);
            var spot = go.AddComponent<BranchHotspot>();
            spot.HotspotId = id;
            spot.PromptKey = prompt;
            spot.Remember();
        }

        static void Sign(Transform parent, string text, Vector3 pos, Vector3 lookAt)
        {
            var go = new GameObject("Sign");
            go.transform.SetParent(parent, false);
            go.transform.position = pos;
            var facing = lookAt - pos;
            facing.y = 0f;
            if (facing.sqrMagnitude < 0.001f) facing = Vector3.forward;
            go.transform.rotation = Quaternion.LookRotation(facing);
            var mesh = go.AddComponent<TextMesh>();
            mesh.text = text ?? "";
            mesh.font = UiKit.Font;
            mesh.fontSize = 48;
            mesh.characterSize = 0.04f;
            mesh.anchor = TextAnchor.MiddleCenter;
            mesh.alignment = TextAlignment.Center;
            mesh.color = new Color(0.1f, 0.16f, 0.24f);
            var rend = go.GetComponent<MeshRenderer>();
            if (mesh.font != null && mesh.font.material != null) rend.sharedMaterial = mesh.font.material;
        }

        static Material Paint(Color color)
        {
            var bytes = (Color32)color;
            var key = (bytes.r << 16) | (bytes.g << 8) | bytes.b;
            Material mat;
            if (Paints.TryGetValue(key, out mat)) return mat;
            if (_shader == null)
            {
                var probe = GameObject.CreatePrimitive(PrimitiveType.Cube);
                probe.SetActive(false);
                _shader = probe.GetComponent<Renderer>().sharedMaterial.shader;
                DestroyImmediate(probe);
            }
            mat = new Material(_shader);
            if (mat.HasProperty("_Color")) mat.color = color;
            if (mat.HasProperty("_Glossiness")) mat.SetFloat("_Glossiness", 0.08f);
            if (mat.HasProperty("_Metallic")) mat.SetFloat("_Metallic", 0f);
            Paints[key] = mat;
            return mat;
        }

        static RectTransform HudBox(Transform parent, float x, float y, float w, float h)
        {
            var go = new GameObject("Hud", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rect = go.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(0f, 1f);
            rect.pivot = new Vector2(0f, 1f);
            rect.anchoredPosition = new Vector2(x, -y);
            rect.sizeDelta = new Vector2(w, h);
            return rect;
        }

        static RectTransform PanelBox(RectTransform parent, float x, float y, float w, float h)
        {
            return HudBox(parent, x, y, w, h);
        }

        static Text Label(RectTransform parent, string value, int size, FontStyle style, Color color, TextAnchor align, float x, float y, float w, float h)
        {
            var rect = HudBox(parent, x, y, w, h);
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

        static void HudButton(RectTransform parent, string label, float x, float y, float w, float h, Color bg, UnityEngine.Events.UnityAction action)
        {
            var ink = bg.r > 0.7f && bg.g > 0.7f ? UiKit.Slate : UiKit.White;
            if (bg.r > 0.9f && bg.g > 0.6f && bg.b < 0.4f) ink = UiKit.OrangeInk;
            ModalButton(parent, label, x, y, w, h, bg, ink, action);
        }

        static void ModalButton(RectTransform parent, string label, float x, float y, float w, float h, Color bg, Color ink, UnityEngine.Events.UnityAction action)
        {
            var rect = HudBox(parent, x, y, w, h);
            var image = rect.gameObject.AddComponent<Image>();
            image.color = bg;
            var button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            button.onClick.AddListener(action);
            Label(rect, label, 18, FontStyle.Bold, ink, TextAnchor.MiddleCenter, 8f, 4f, w - 16f, h - 8f);
        }
    }

    public sealed class BranchHotspot : MonoBehaviour
    {
        public string HotspotId;
        public string PromptKey;
        public Color BaseColor;
        Renderer _renderer;

        public void Remember()
        {
            _renderer = GetComponent<Renderer>();
            if (_renderer == null) return;
            BaseColor = _renderer.material.color;
        }

        public void SetLit(bool on)
        {
            if (_renderer == null) return;
            _renderer.material.color = on ? Color.Lerp(BaseColor, Color.white, 0.5f) : BaseColor;
        }
    }
}
