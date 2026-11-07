using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace TwinAml.EditorTools
{
    [InitializeOnLoad]
    public static class TwinAmlProjectSetup
    {
        const string BootScene = "Assets/Scenes/Scn_Boot.unity";
        const string LobbyScene = "Assets/Scenes/3D/Scn_Branch_Lobby.unity";

        static TwinAmlProjectSetup()
        {
            EditorApplication.delayCall += Sync;
        }

        [MenuItem("TwinAML/Open Boot Scene")]
        public static void OpenBoot()
        {
            Sync();
            EditorSceneManager.OpenScene(BootScene);
        }

        [MenuItem("TwinAML/Play From Boot")]
        public static void PlayFromBoot()
        {
            PlayLobby();
        }

        [MenuItem("TwinAML/Play Branch Lobby")]
        public static void PlayLobby()
        {
            Sync();
            EditorSceneManager.OpenScene(LobbyScene);
            EditorApplication.EnterPlaymode();
        }

        [MenuItem("TwinAML/3D Scenes/Branch Lobby")]
        public static void OpenLobby() { Open3D(SceneId.Scn_Branch_Lobby); }

        [MenuItem("TwinAML/3D Scenes/Branch Relationship Desk")]
        public static void OpenDesk() { Open3D(SceneId.Scn_Branch_Desk); }

        [MenuItem("TwinAML/3D Scenes/Branch Meeting Room")]
        public static void OpenMeeting() { Open3D(SceneId.Scn_Branch_Meeting); }

        [MenuItem("TwinAML/3D Scenes/Branch File Room")]
        public static void OpenFiles() { Open3D(SceneId.Scn_Branch_Files); }

        [MenuItem("TwinAML/3D Scenes/Branch Compliance Office")]
        public static void OpenCompliance() { Open3D(SceneId.Scn_Branch_Compliance); }

        [MenuItem("TwinAML/3D Scenes/Triage Analyst Desk")]
        public static void OpenTriageDesk() { Open3D(SceneId.Scn_Triage_Desk); }

        [MenuItem("TwinAML/3D Scenes/Triage Map Wall")]
        public static void OpenTriageMap() { Open3D(SceneId.Scn_Triage_Map); }

        [MenuItem("TwinAML/3D Scenes/Triage Customer Wall")]
        public static void OpenTriageProfiles() { Open3D(SceneId.Scn_Triage_Profiles); }

        [MenuItem("TwinAML/3D Scenes/Triage Link Board")]
        public static void OpenTriageLinks() { Open3D(SceneId.Scn_Triage_Links); }

        [MenuItem("TwinAML/3D Scenes/Triage Meeting")]
        public static void OpenTriageMeeting() { Open3D(SceneId.Scn_Triage_Meeting); }

        [MenuItem("TwinAML/3D Scenes/Triage Senior Office")]
        public static void OpenTriageSenior() { Open3D(SceneId.Scn_Triage_Senior); }

        static void Open3D(SceneId id)
        {
            Sync();
            EditorSceneManager.OpenScene(SceneCatalog.AssetPath(id));
        }

        [MenuItem("TwinAML/Sync Scenes Into Build Settings")]
        public static void Sync()
        {
            if (PlayerSettings.productName != "TwinAML") PlayerSettings.productName = "TwinAML";
            if (PlayerSettings.companyName != "TwinAML") PlayerSettings.companyName = "TwinAML";

            var desired = new List<EditorBuildSettingsScene>();
            for (var i = 0; i < SceneCatalog.BuildOrder.Length; i++)
            {
                var path = SceneCatalog.AssetPath(SceneCatalog.BuildOrder[i]);
                desired.Add(new EditorBuildSettingsScene(path, true));
            }
            var current = EditorBuildSettings.scenes;
            if (current.Length == desired.Count)
            {
                var same = true;
                for (var i = 0; i < current.Length; i++)
                {
                    if (current[i].path != desired[i].path || !current[i].enabled)
                    {
                        same = false;
                        break;
                    }
                }
                if (same) return;
            }
            EditorBuildSettings.scenes = desired.ToArray();
            Debug.Log("TwinAML build settings now start at Scn_Branch_Lobby.");
        }
    }
}
