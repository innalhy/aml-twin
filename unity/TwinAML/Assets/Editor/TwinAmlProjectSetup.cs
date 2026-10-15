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
            OpenBoot();
            EditorApplication.EnterPlaymode();
        }

        [MenuItem("TwinAML/Sync Scenes Into Build Settings")]
        public static void Sync()
        {
            if (PlayerSettings.productName != "TwinAML") PlayerSettings.productName = "TwinAML";
            if (PlayerSettings.companyName != "TwinAML") PlayerSettings.companyName = "TwinAML";

            var desired = new List<EditorBuildSettingsScene>();
            for (var i = 0; i < SceneCatalog.BuildOrder.Length; i++)
            {
                var path = "Assets/Scenes/" + SceneCatalog.BuildOrder[i] + ".unity";
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
            Debug.Log("TwinAML build settings now start at Scn_Boot.");
        }
    }
}
