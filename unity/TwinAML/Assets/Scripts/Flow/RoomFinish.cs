using UnityEngine;
using UnityEngine.Rendering;

namespace TwinAml
{
    /// <summary>
    /// Lit surfaces and room dressing shared by the branch and the monitoring unit.
    /// Built-in pipeline only. Textures are generated once and cached.
    /// </summary>
    public static class RoomFinish
    {
        static Shader _shader;
        static MaterialPropertyBlock _tint;
        static readonly System.Collections.Generic.Dictionary<int, Material> Cache =
            new System.Collections.Generic.Dictionary<int, Material>();
        static readonly System.Collections.Generic.Dictionary<int, Texture2D> Textures =
            new System.Collections.Generic.Dictionary<int, Texture2D>();

        /// <summary>
        /// 0 plaster, 1 wood, 2 carpet, 3 glass or screen, 4 metal.
        /// </summary>
        public static Material ForStyle(Color color, int style)
        {
            var gloss = 0.16f;
            var metal = 0f;
            var tile = 1.4f;
            var emit = false;
            if (style == 1) { gloss = 0.34f; tile = 1.6f; }
            else if (style == 2) { gloss = 0.05f; tile = 4.5f; }
            else if (style == 3) { gloss = 0.62f; metal = 0.08f; tile = 1f; emit = true; }
            else if (style == 4) { gloss = 0.48f; metal = 0.55f; tile = 1.2f; }
            return Surface(color, gloss, metal, style, tile, emit);
        }

        /// <summary>
        /// Tints one renderer without cloning its shared material.
        /// </summary>
        public static void Tint(Renderer renderer, Color color)
        {
            if (renderer == null) return;
            if (_tint == null) _tint = new MaterialPropertyBlock();
            _tint.Clear();
            _tint.SetColor("_Color", color);
            renderer.SetPropertyBlock(_tint);
        }

        public static Material Surface(Color color, float gloss, float metal, int style, float tile, bool emit)
        {
            var key = MaterialKey((Color32)color, style, gloss, metal, tile, emit);
            Material mat;
            if (Cache.TryGetValue(key, out mat) && mat != null) return mat;
            var shader = ShaderFor();
            mat = new Material(shader);
            mat.hideFlags = HideFlags.HideAndDontSave;
            if (mat.HasProperty("_Color")) mat.color = color;
            if (mat.HasProperty("_MainTex")) mat.mainTexture = Grain(style, key);
            mat.mainTextureScale = new Vector2(tile, tile);
            if (mat.HasProperty("_Glossiness")) mat.SetFloat("_Glossiness", gloss);
            if (mat.HasProperty("_Metallic")) mat.SetFloat("_Metallic", metal);
            if (emit && mat.HasProperty("_EmissionColor"))
            {
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", color * 1.35f);
            }
            Cache[key] = mat;
            return mat;
        }

        public static void Sun(Color color, float intensity, Vector3 euler)
        {
            Light sun = null;
            var lights = Object.FindObjectsOfType<Light>();
            for (var i = 0; i < lights.Length; i++)
            {
                if (lights[i] != null && lights[i].type == LightType.Directional) sun = lights[i];
            }
            if (sun == null)
            {
                var go = new GameObject("Sun");
                sun = go.AddComponent<Light>();
                sun.type = LightType.Directional;
            }
            sun.color = color;
            sun.intensity = intensity;
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = 0.65f;
            sun.transform.rotation = Quaternion.Euler(euler);
        }

        public static void DressBranch(Transform world, string zone)
        {
            Block(world, "Ceiling", new Vector3(6f, 3.22f, 5f), new Vector3(12.15f, 0.1f, 10.15f), new Color(0.93f, 0.93f, 0.9f), 0, false);
            Skirt(world, new Vector3(3.15f, 0.24f, 0.28f), new Vector3(4.4f, 0.18f, 0.1f));
            Skirt(world, new Vector3(8.85f, 0.24f, 0.28f), new Vector3(4.4f, 0.18f, 0.1f));
            Skirt(world, new Vector3(3.15f, 0.24f, 9.72f), new Vector3(4.4f, 0.18f, 0.1f));
            Skirt(world, new Vector3(8.85f, 0.24f, 9.72f), new Vector3(4.4f, 0.18f, 0.1f));
            Skirt(world, new Vector3(0.22f, 0.24f, 5f), new Vector3(0.1f, 0.18f, 9.2f));
            Skirt(world, new Vector3(11.78f, 0.24f, 5f), new Vector3(0.1f, 0.18f, 9.2f));
            Frame(world, new Vector3(11.62f, 2.1f, 5f), true);
            Outside(world, new Vector3(14.2f, 1.6f, 5f), true);
            Hang(world, new Vector3(4f, 3.08f, 3.1f));
            Hang(world, new Vector3(8.2f, 3.08f, 3.1f));
            Hang(world, new Vector3(4f, 3.08f, 7.1f));
            Hang(world, new Vector3(8.2f, 3.08f, 7.1f));
            Plant(world, new Vector3(1.15f, 0.16f, 8.4f));
            Plant(world, new Vector3(10.7f, 0.16f, 1.5f));
            var rug = zone == "meeting" ? new Color(0.55f, 0.32f, 0.28f)
                : zone == "compliance" ? new Color(0.28f, 0.4f, 0.52f)
                : new Color(0.32f, 0.4f, 0.48f);
            Block(world, "Rug", new Vector3(6f, 0.17f, 5f), new Vector3(4.2f, 0.03f, 2.6f), rug, 2, false);
        }

        public static void DressMonitor(Transform world)
        {
            Block(world, "Ceiling", new Vector3(0f, 3.45f, 0f), new Vector3(16.3f, 0.12f, 12.4f), new Color(0.78f, 0.8f, 0.84f), 0, false);
            Block(world, "Carpet", new Vector3(0f, 0.02f, -0.4f), new Vector3(12.4f, 0.03f, 8.6f), new Color(0.22f, 0.28f, 0.36f), 2, false);
            Skirt(world, new Vector3(0f, 0.16f, 6.02f), new Vector3(15.6f, 0.16f, 0.08f));
            Skirt(world, new Vector3(-7.9f, 0.16f, 0f), new Vector3(0.08f, 0.16f, 11.6f));
            Skirt(world, new Vector3(7.9f, 0.16f, 0f), new Vector3(0.08f, 0.16f, 11.6f));
            Block(world, "Glass", new Vector3(0f, 1.85f, -6.02f), new Vector3(9.2f, 1.7f, 0.06f), new Color(0.45f, 0.62f, 0.78f), 3, false);
            FrameMonitor(world);
            Outside(world, new Vector3(0f, 1.5f, -9.2f), false);
            Hang(world, new Vector3(-4.2f, 3.28f, -2.2f));
            Hang(world, new Vector3(3.6f, 3.28f, -2.2f));
            Hang(world, new Vector3(-3.2f, 3.28f, 2.4f));
            Hang(world, new Vector3(4.4f, 3.28f, 2.6f));
            Plant(world, new Vector3(-6.6f, 0.02f, -5.2f));
            Plant(world, new Vector3(6.8f, 0.02f, -4.8f));
            Leg(world, new Vector3(-1.15f, 0.36f, -2.55f));
            Leg(world, new Vector3(1.15f, 0.36f, -2.55f));
            Leg(world, new Vector3(-1.15f, 0.36f, -1.75f));
            Leg(world, new Vector3(1.15f, 0.36f, -1.75f));
            Block(world, "ChairBack", new Vector3(0f, 0.78f, -3.48f), new Vector3(0.52f, 0.48f, 0.06f), new Color(0.24f, 0.3f, 0.38f), 4, false);
        }

        public static void Seat(Transform parent, string name, Vector3 feet, Color cloth, float yaw = 0f)
        {
            var root = new GameObject(name);
            root.transform.SetParent(parent, false);
            root.transform.position = feet;
            root.transform.rotation = Quaternion.Euler(0f, yaw, 0f);
            Block(root.transform, "Pad", new Vector3(0f, 0.42f, 0f), new Vector3(0.52f, 0.08f, 0.5f), cloth, 0, false);
            Block(root.transform, "Back", new Vector3(0f, 0.72f, -0.22f), new Vector3(0.52f, 0.48f, 0.07f), cloth, 0, false);
            var metal = new Color(0.35f, 0.37f, 0.4f);
            Block(root.transform, "Leg", new Vector3(-0.2f, 0.2f, -0.18f), new Vector3(0.05f, 0.4f, 0.05f), metal, 4, false);
            Block(root.transform, "Leg", new Vector3(0.2f, 0.2f, -0.18f), new Vector3(0.05f, 0.4f, 0.05f), metal, 4, false);
            Block(root.transform, "Leg", new Vector3(-0.2f, 0.2f, 0.18f), new Vector3(0.05f, 0.4f, 0.05f), metal, 4, false);
            Block(root.transform, "Leg", new Vector3(0.2f, 0.2f, 0.18f), new Vector3(0.05f, 0.4f, 0.05f), metal, 4, false);
            var box = root.AddComponent<BoxCollider>();
            box.center = new Vector3(0f, 0.45f, 0f);
            box.size = new Vector3(0.55f, 0.95f, 0.55f);
        }

        public static void PersonDetail(Transform root, Color cloth)
        {
            if (root == null) return;
            Limb(root, PrimitiveType.Capsule, new Vector3(0.34f, 1.12f, 0.02f), new Vector3(0.13f, 0.26f, 0.13f), new Vector3(0f, 0f, 16f), cloth);
            Limb(root, PrimitiveType.Capsule, new Vector3(-0.34f, 1.12f, 0.02f), new Vector3(0.13f, 0.26f, 0.13f), new Vector3(0f, 0f, -16f), cloth);
            Limb(root, PrimitiveType.Sphere, new Vector3(0f, 1.76f, 0.02f), new Vector3(0.3f, 0.16f, 0.3f), Vector3.zero, new Color(0.16f, 0.11f, 0.09f));
        }

        static void Skirt(Transform parent, Vector3 pos, Vector3 scale)
        {
            Block(parent, "Skirting", pos, scale, new Color(0.82f, 0.8f, 0.74f), 1, false);
        }

        static void Frame(Transform parent, Vector3 center, bool alongZ)
        {
            var trim = new Color(0.86f, 0.87f, 0.88f);
            if (alongZ)
            {
                Block(parent, "WinFrame", center + new Vector3(0f, 0.72f, 0f), new Vector3(0.08f, 0.08f, 3.4f), trim, 4, false);
                Block(parent, "WinFrame", center + new Vector3(0f, -0.72f, 0f), new Vector3(0.08f, 0.08f, 3.4f), trim, 4, false);
                Block(parent, "WinFrame", center + new Vector3(0f, 0f, 1.68f), new Vector3(0.08f, 1.5f, 0.08f), trim, 4, false);
                Block(parent, "WinFrame", center + new Vector3(0f, 0f, -1.68f), new Vector3(0.08f, 1.5f, 0.08f), trim, 4, false);
                Block(parent, "WinMullion", center, new Vector3(0.06f, 1.4f, 0.05f), trim, 4, false);
            }
        }

        static void FrameMonitor(Transform parent)
        {
            var trim = new Color(0.72f, 0.75f, 0.78f);
            Block(parent, "WinFrame", new Vector3(0f, 2.72f, -5.98f), new Vector3(9.5f, 0.08f, 0.08f), trim, 4, false);
            Block(parent, "WinFrame", new Vector3(0f, 0.98f, -5.98f), new Vector3(9.5f, 0.08f, 0.08f), trim, 4, false);
            Block(parent, "WinFrame", new Vector3(-4.7f, 1.85f, -5.98f), new Vector3(0.08f, 1.8f, 0.08f), trim, 4, false);
            Block(parent, "WinFrame", new Vector3(4.7f, 1.85f, -5.98f), new Vector3(0.08f, 1.8f, 0.08f), trim, 4, false);
        }

        static void Outside(Transform parent, Vector3 origin, bool branch)
        {
            var sky = new Color(0.62f, 0.74f, 0.84f);
            var tower = new Color(0.45f, 0.52f, 0.6f);
            var towerB = new Color(0.32f, 0.38f, 0.46f);
            if (branch)
            {
                Block(parent, "Sky", origin + new Vector3(2.2f, 1.2f, 0f), new Vector3(0.2f, 6f, 8f), sky, 3, false);
                Block(parent, "Tower", origin + new Vector3(1.2f, 0.4f, -1.6f), new Vector3(0.8f, 3.2f, 1.1f), tower, 0, false);
                Block(parent, "Tower", origin + new Vector3(1.4f, 0.1f, 1.8f), new Vector3(0.7f, 2.4f, 1.3f), towerB, 0, false);
            }
            else
            {
                Block(parent, "Sky", origin + new Vector3(0f, 1.4f, -1.5f), new Vector3(14f, 6f, 0.2f), new Color(0.1f, 0.14f, 0.2f), 3, false);
                Block(parent, "Tower", origin + new Vector3(-3.2f, 0.6f, 0f), new Vector3(1.4f, 3.4f, 0.8f), tower, 0, false);
                Block(parent, "Tower", origin + new Vector3(2.4f, 0.2f, 0.2f), new Vector3(1.8f, 2.6f, 0.8f), towerB, 0, false);
                Block(parent, "TowerLight", origin + new Vector3(-3.2f, 1.8f, 0.42f), new Vector3(0.35f, 0.22f, 0.04f), new Color(0.95f, 0.82f, 0.45f), 3, false);
            }
        }

        static void Hang(Transform parent, Vector3 pos)
        {
            Block(parent, "Lamp", pos, new Vector3(0.85f, 0.04f, 0.28f), new Color(0.96f, 0.94f, 0.82f), 3, false);
            var go = new GameObject("Fill");
            go.transform.SetParent(parent, false);
            go.transform.position = pos + new Vector3(0f, -0.15f, 0f);
            var light = go.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(1f, 0.95f, 0.86f);
            light.intensity = 0.85f;
            light.range = 7.5f;
            light.shadows = LightShadows.None;
        }

        static void Plant(Transform parent, Vector3 feet)
        {
            Block(parent, "Pot", feet + new Vector3(0f, 0.16f, 0f), new Vector3(0.28f, 0.28f, 0.28f), new Color(0.42f, 0.28f, 0.2f), 0, true);
            var stem = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            stem.name = "Stem";
            stem.transform.SetParent(parent, false);
            stem.transform.position = feet + new Vector3(0f, 0.48f, 0f);
            stem.transform.localScale = new Vector3(0.06f, 0.22f, 0.06f);
            var stemRenderer = stem.GetComponent<Renderer>();
            if (stemRenderer != null) stemRenderer.sharedMaterial = ForStyle(new Color(0.2f, 0.32f, 0.18f), 0);
            StripCollider(stem);
            var leaves = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            leaves.name = "Leaves";
            leaves.transform.SetParent(parent, false);
            leaves.transform.position = feet + new Vector3(0f, 0.78f, 0f);
            leaves.transform.localScale = new Vector3(0.42f, 0.32f, 0.42f);
            var leafRenderer = leaves.GetComponent<Renderer>();
            if (leafRenderer != null) leafRenderer.sharedMaterial = ForStyle(new Color(0.22f, 0.42f, 0.24f), 0);
            StripCollider(leaves);
        }

        static void StripCollider(GameObject go)
        {
            var collider = go.GetComponent<Collider>();
            if (collider == null) return;
            collider.enabled = false;
            Object.Destroy(collider);
        }

        static void Leg(Transform parent, Vector3 pos)
        {
            Block(parent, "DeskLeg", pos, new Vector3(0.06f, 0.7f, 0.06f), new Color(0.55f, 0.57f, 0.6f), 4, false);
        }

        static void Limb(Transform parent, PrimitiveType type, Vector3 pos, Vector3 scale, Vector3 euler, Color color)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = type == PrimitiveType.Sphere ? "Hair" : "Arm";
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            go.transform.localRotation = Quaternion.Euler(euler);
            var collider = go.GetComponent<Collider>();
            if (collider != null) Object.Destroy(collider);
            var renderer = go.GetComponent<Renderer>();
            if (renderer != null) renderer.sharedMaterial = ForStyle(color, 0);
        }

        static void Block(Transform parent, string name, Vector3 pos, Vector3 scale, Color color, int style, bool solid)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.position = pos;
            go.transform.localScale = scale;
            var renderer = go.GetComponent<Renderer>();
            if (renderer != null)
            {
                renderer.sharedMaterial = ForStyle(color, style);
                renderer.shadowCastingMode = solid ? ShadowCastingMode.On : ShadowCastingMode.Off;
                renderer.receiveShadows = true;
            }
            if (!solid)
            {
                var collider = go.GetComponent<Collider>();
                if (collider != null) Object.Destroy(collider);
            }
        }

        static int MaterialKey(Color32 bytes, int style, float gloss, float metal, float tile, bool emit)
        {
            unchecked
            {
                var key = ((int)bytes.r << 24) | ((int)bytes.g << 16) | ((int)bytes.b << 8) | (style & 15);
                key = (key * 397) ^ (int)(gloss * 1000f);
                key = (key * 397) ^ (int)(metal * 1000f);
                key = (key * 397) ^ (int)(tile * 100f);
                if (emit) key = (key * 397) ^ 1;
                return key;
            }
        }

        static Shader ShaderFor()
        {
            if (_shader != null) return _shader;
            _shader = Shader.Find("Standard");
            if (_shader == null) _shader = Shader.Find("Diffuse");
            if (_shader == null) _shader = Shader.Find("Unlit/Color");
            return _shader;
        }

        static Texture2D Grain(int style, int seed)
        {
            Texture2D tex;
            if (Textures.TryGetValue(seed, out tex) && tex != null) return tex;
            const int n = 48;
            tex = new Texture2D(n, n, TextureFormat.RGB24, false);
            tex.hideFlags = HideFlags.HideAndDontSave;
            tex.wrapMode = TextureWrapMode.Repeat;
            tex.filterMode = FilterMode.Bilinear;
            var rng = new System.Random(seed == 0 ? 1 : seed);
            for (var y = 0; y < n; y++)
            {
                for (var x = 0; x < n; x++)
                {
                    var noise = (float)rng.NextDouble();
                    var t = 0.82f + noise * 0.16f;
                    if (style == 1)
                    {
                        var stripe = Mathf.Sin((x * 0.55f) + noise * 2.2f) * 0.5f + 0.5f;
                        var line = Mathf.Abs(Mathf.Sin(y * 0.35f + x * 0.04f));
                        t = 0.62f + stripe * 0.28f + line * 0.1f;
                    }
                    else if (style == 2)
                    {
                        var cell = ((x / 6) + (y / 6)) % 2 == 0 ? 0.78f : 0.92f;
                        t = cell + (noise - 0.5f) * 0.06f;
                    }
                    else if (style == 4)
                    {
                        t = 0.8f + (x % 8 == 0 ? 0.12f : 0f) + noise * 0.08f;
                    }
                    else if (style == 3)
                    {
                        t = y > n - 8 ? 1f : 0.75f + noise * 0.12f;
                    }
                    var shade = Mathf.Clamp01(t);
                    tex.SetPixel(x, y, new Color(shade, shade, shade));
                }
            }
            tex.Apply(false, true);
            Textures[seed] = tex;
            return tex;
        }
    }
}
