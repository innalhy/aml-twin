using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace TwinAml
{
    public sealed class FlowController : MonoBehaviour
    {
        public static FlowController Instance { get; private set; }

        public SceneId Current = SceneId.Scn_Boot;
        public string Trainee = "";
        public TwinSession Session;
        public readonly List<TwinSession> Completed = new List<TwinSession>();
        public string LastError = "";
        public int PortalPage;
        public bool BellOpen;
        public string PortalNotice = "";

        long _choiceShownUnixMs;
        bool _entered;
        bool _queueGo;
        SceneId _queued;
        bool _committedThisScreen;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Bootstrap()
        {
            if (FindAnyObjectByType<FlowController>() != null) return;
            var go = new GameObject("TwinAML.Flow");
            go.AddComponent<FlowController>();
        }

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            SceneManager.sceneLoaded += OnSceneLoaded;
            if (Completed.Count == 0)
            {
                var restored = DashboardStore.Read();
                for (var i = 0; i < restored.Count; i++) Completed.Add(restored[i]);
            }
        }

        void OnDestroy()
        {
            if (Instance == this) Instance = null;
            SceneManager.sceneLoaded -= OnSceneLoaded;
        }

        void Start()
        {
            if (_entered) return;
            var active = SceneManager.GetActiveScene().name;
            if (!SceneCatalog.TryParse(active, out var id)) id = SceneId.Scn_Boot;
            Enter(id);
        }

        void OnSceneLoaded(Scene scene, LoadSceneMode mode)
        {
            if (!SceneCatalog.TryParse(scene.name, out var id)) return;
            Enter(id);
        }

        public void Go(SceneId id)
        {
            _queued = id;
            _queueGo = true;
        }

        public void OpenPortal(int page)
        {
            if (page < 0) page = 0;
            if (page > 3) page = 3;
            PortalPage = page;
            Go(SceneId.Scn_Dashboard);
        }

        void LateUpdate()
        {
            if (!_queueGo) return;
            _queueGo = false;
            PerformGo(_queued);
        }

        void PerformGo(SceneId id)
        {
            Current = id;
            var sceneName = id.ToString();
            if (SceneManager.GetActiveScene().name == sceneName || !Application.CanStreamedLevelBeLoaded(sceneName))
            {
                Enter(id);
                return;
            }
            SceneManager.LoadScene(sceneName);
        }

        public void SetLocale(LocaleCode code)
        {
            Locale.Current = code;
            Enter(Current);
        }

        public void StartTopic(string topic)
        {
            LastError = "";
            var session = new TwinSession();
            session.Trainee = string.IsNullOrEmpty(Trainee) ? "Trainee" : Trainee.Trim();
            session.Topic = topic;
            try
            {
                if (topic == "T01")
                {
                    session.Script = CaseLibrary.LoadCase(CaseLibrary.T01CaseId);
                    session.CaseId = CaseLibrary.T01CaseId;
                }
                else if (topic == "T03")
                {
                    BranchProgress.Reset();
                    session.Script = CaseLibrary.LoadCase(CaseLibrary.T03CaseId);
                    session.CaseId = CaseLibrary.T03CaseId;
                }
                else if (topic == "T04")
                {
                    session.Script = CaseLibrary.LoadCase(CaseLibrary.T04CaseId);
                    session.CaseId = CaseLibrary.T04CaseId;
                }
                else
                {
                    session.Script = CaseLibrary.LoadCase(CaseLibrary.T02CaseId);
                    session.CaseId = CaseLibrary.T02CaseId;
                }
                var title = session.Script.Get("title");
                session.CaseTitle = title != null && title.Kind == JsonKind.String ? title.String : session.CaseId;
                var loadedId = session.Script.Get("case_id");
                if (loadedId == null || loadedId.String != session.CaseId)
                    throw new EffectException("Loaded file case_id does not match " + session.CaseId + ".");
                session.Twin = session.Script.Require("initial_twin_state").Clone();
                TwinProjector.Apply(session, null);
                if (topic == "T04") TriageShift.Begin(session.CaseId);
                session.Trap = false;
                session.FundsRisk = false;
                session.Completed = false;
            }
            catch (Exception err)
            {
                LastError = err.Message;
                session.Script = null;
                if (topic == "T04") TriageShift.Clear();
            }
            Session = session;
        }

        public void FinishTriage()
        {
            if (Session != null && Session.Completed && Session.Topic == "T04")
            {
                Go(SceneId.Scn_T04_Report);
                return;
            }
            if (Session == null || Session.Script == null || Session.Topic != "T04" || !TriageShift.AllDecided())
            {
                LastError = "Finish the six alerts before the shift report.";
                return;
            }
            var filed = false;
            try
            {
                var ids = TriageShift.ChoiceIds();
                var played = EffectApplier.Play(Session.Script, ids);
                Session.Twin = played.Twin;
                Session.TerminalNodeId = played.NodeId;
                TwinProjector.Apply(Session, null);
                var score = TriageShift.BuildScore();
                Session.Trap = score.HardFail || score.Overall < 60;
                Session.FundsRisk = Session.Trap;
                Session.MappingNote = "Topic 4 grades the six dispositions in the room. shift_reviewed means the queue was written down. A pass is a training score of 60 or more, with no closed file and no STR filed on the name-only screening hit.";
                var record = new ChoiceRecord();
                record.ChoiceId = Session.Trap ? "shift_below_pass" : "shift_pass";
                record.SceneId = SceneId.Scn_T04_Room.ToString();
                record.CaseId = Session.CaseId;
                record.ShownUnixMs = TriageShift.StartedMs > 0 ? TriageShift.StartedMs : NowMs();
                record.ChosenUnixMs = NowMs();
                record.ReactionMs = (int)Math.Max(0, record.ChosenUnixMs - record.ShownUnixMs);
                record.Trap = Session.Trap;
                for (var i = 0; i < ids.Count; i++) record.ScriptChoiceIds.Add(ids[i]);
                Session.Choices.Add(record);
                Session.Completed = true;
                Completed.Add(Session);
                filed = true;
                DashboardStore.Write(Trainee, Completed);
                LastError = "";
                TriageShift.Finished = true;
            }
            catch (Exception err)
            {
                if (filed)
                {
                    if (Completed.Count > 0 && Completed[Completed.Count - 1] == Session)
                        Completed.RemoveAt(Completed.Count - 1);
                    if (Session != null && Session.Choices.Count > 0)
                        Session.Choices.RemoveAt(Session.Choices.Count - 1);
                    if (Session != null) Session.Completed = false;
                }
                LastError = err.Message;
                Debug.LogError("TwinAML shift failed: " + err.Message);
                return;
            }
            Go(SceneId.Scn_T04_Report);
        }

        public void ArmChoiceClock()
        {
            _choiceShownUnixMs = NowMs();
        }

        public bool Commit(string choiceId)
        {
            if (_committedThisScreen) return false;
            var choice = RoomPaths.Find(choiceId);
            if (choice == null)
            {
                LastError = "Unknown choice " + choiceId + ".";
                ShowChoiceError();
                return false;
            }
            if (Session == null || Session.Script == null)
            {
                var topic = SceneCatalog.TopicOf(choice.Next);
                if (string.IsNullOrEmpty(Trainee)) Trainee = "Editor";
                if (topic == "T01" || topic == "T02" || topic == "T03") StartTopic(topic);
            }
            if (Session == null || Session.Script == null)
            {
                if (string.IsNullOrEmpty(LastError))
                    LastError = "The case file did not load.";
                ShowChoiceError();
                return false;
            }
            var filed = false;
            try
            {
                var played = EffectApplier.Play(Session.Script, choice.ScriptChoices);
                Session.Twin = played.Twin;
                Session.TerminalNodeId = played.NodeId;
                TwinProjector.Apply(Session, choice);
                if (Session.Topic == "T03")
                {
                    Session.LearningScore = BranchProgress.Score(choice.ChoiceId);
                    Session.ElapsedMs = BranchProgress.ElapsedMs();
                    var lesson = BranchProgress.MappingLine(choice.ChoiceId);
                    Session.MappingNote = string.IsNullOrEmpty(Session.MappingNote) ? lesson : Session.MappingNote + " " + lesson;
                }
                var chosenAt = NowMs();
                var record = new ChoiceRecord();
                record.ChoiceId = choice.ChoiceId;
                record.SceneId = Current.ToString();
                record.CaseId = Session.CaseId;
                record.ShownUnixMs = _choiceShownUnixMs > 0 ? _choiceShownUnixMs : chosenAt;
                record.ChosenUnixMs = chosenAt;
                record.ReactionMs = (int)Math.Max(0, record.ChosenUnixMs - record.ShownUnixMs);
                record.Trap = Session.Trap;
                for (var i = 0; i < choice.ScriptChoices.Count; i++)
                    record.ScriptChoiceIds.Add(choice.ScriptChoices[i]);
                Session.Choices.Add(record);
                Session.Completed = true;
                Completed.Add(Session);
                filed = true;
                DashboardStore.Write(Trainee, Completed);
                LastError = "";
            }
            catch (Exception err)
            {
                if (filed)
                {
                    if (Completed.Count > 0 && Completed[Completed.Count - 1] == Session)
                        Completed.RemoveAt(Completed.Count - 1);
                    if (Session != null && Session.Choices.Count > 0)
                        Session.Choices.RemoveAt(Session.Choices.Count - 1);
                    if (Session != null) Session.Completed = false;
                }
                LastError = err.Message;
                Debug.LogError("TwinAML choice failed: " + err.Message);
                ShowChoiceError();
                return false;
            }
            _committedThisScreen = true;
            Go(choice.Next);
            return true;
        }

        void ShowChoiceError()
        {
            if (SceneCatalog.IsBranchRoom(Current)) return;
            ScreenBuilder.Build(Current);
        }

        public int TrapCount()
        {
            var count = 0;
            for (var i = 0; i < Completed.Count; i++)
            {
                if (Completed[i].Trap) count++;
            }
            return count;
        }

        public int MeanReactionMs()
        {
            if (Completed.Count == 0) return 0;
            long sum = 0;
            var n = 0;
            for (var i = 0; i < Completed.Count; i++)
            {
                var last = Completed[i].LastChoice;
                if (last == null) continue;
                sum += last.ReactionMs;
                n++;
            }
            if (n == 0) return 0;
            return (int)(sum / n);
        }

        void Enter(SceneId id)
        {
            if (IsPortalFront(id) || id == SceneId.Scn_T03_Branch)
            {
                Go(SceneId.Scn_Branch_Lobby);
                return;
            }
            if (id == SceneId.Scn_T04_Room)
            {
                Go(SceneId.Scn_Triage_Desk);
                return;
            }
            _entered = true;
            _committedThisScreen = false;
            Current = id;
            EnsureTopic(SceneCatalog.TopicOf(id));
            ScreenBuilder.Build(id);
        }

        static bool IsPortalFront(SceneId id)
        {
            return id == SceneId.Scn_Boot
                || id == SceneId.Scn_Login
                || id == SceneId.Scn_Intro
                || id == SceneId.Scn_TopicsHub
                || id == SceneId.Scn_Dashboard;
        }

        void EnsureTopic(string topic)
        {
            if (topic != "T01" && topic != "T02" && topic != "T03" && topic != "T04") return;
            if (Session != null && Session.Topic == topic && Session.Script != null)
                return;
            if (string.IsNullOrEmpty(Trainee)) Trainee = "Editor";
            StartTopic(topic);
        }

        static long NowMs()
        {
            return (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
        }
    }
}
