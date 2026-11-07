using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;

namespace TwinAml
{
    /// <summary>
    /// Mouse-only view for the 3D rooms. Drag to orbit. A short left click is
    /// separate from a drag, so the rooms can walk or use an object without keys.
    /// </summary>
    public static class PointerView
    {
        public static float Yaw = 18f;
        public static float Pitch = 16f;
        public static bool HasGoal;
        public static Vector3 Goal;

        static bool _left;
        static bool _right;
        static bool _dragged;
        static Vector3 _anchor;
        static Vector3 _last;
        const float Slop = 7f;
        static readonly List<RaycastResult> UiHits = new List<RaycastResult>(8);
        static readonly RaycastHit[] WorldHits = new RaycastHit[48];
        static PointerEventData _pointer;
        static EventSystem _pointerSystem;

        public static void Reset(float yaw)
        {
            Yaw = yaw;
            Pitch = 16f;
            HasGoal = false;
            _left = false;
            _right = false;
            _dragged = false;
        }

        public static void Aim(Vector3 from, Vector3 look)
        {
            HasGoal = false;
            var flat = look - from;
            flat.y = 0f;
            if (flat.sqrMagnitude < 0.0001f) return;
            Yaw = Quaternion.LookRotation(flat.normalized).eulerAngles.y;
            Pitch = 14f;
        }

        /// <summary>
        /// True when the left button was released without becoming a drag.
        /// </summary>
        public static bool TakeClick()
        {
            var over = IsOverUi();
            var click = false;
            if (Input.GetMouseButtonDown(0))
            {
                _left = !over;
                _dragged = false;
                _anchor = Input.mousePosition;
                _last = _anchor;
            }
            if (Input.GetMouseButtonDown(1))
            {
                _right = !over;
                _last = Input.mousePosition;
            }
            var held = (_left && Input.GetMouseButton(0)) || (_right && Input.GetMouseButton(1));
            if (held)
            {
                var now = Input.mousePosition;
                if (_left && (now - _anchor).magnitude > Slop) _dragged = true;
                if (_dragged || _right)
                {
                    var delta = now - _last;
                    Yaw += delta.x * 0.22f;
                    Pitch = Mathf.Clamp(Pitch - delta.y * 0.16f, 5f, 58f);
                }
                _last = now;
            }
            if (_left && Input.GetMouseButtonUp(0))
            {
                click = !_dragged && !IsOverUi();
                _left = false;
                _dragged = false;
            }
            if (!Input.GetMouseButton(0)) _left = false;
            if (Input.GetMouseButtonUp(1) || !Input.GetMouseButton(1)) _right = false;
            return click;
        }

        public static void Orbit(Camera cam, Vector3 feet, float distance, float maxHeight)
        {
            if (cam == null) return;
            var focus = feet + Vector3.up * 1.15f;
            var pos = focus + Quaternion.Euler(Pitch, Yaw, 0f) * new Vector3(0f, 0f, -distance);
            if (pos.y < 0.55f) pos.y = 0.55f;
            if (pos.y > maxHeight) pos.y = maxHeight;
            cam.transform.position = pos;
            cam.transform.LookAt(focus);
        }

        public static void Walk(CharacterController body, Transform actor, ref float vy, float stop = 0.5f)
        {
            if (body == null || actor == null) return;
            var wish = Vector3.zero;
            if (HasGoal)
            {
                var flat = Goal - actor.position;
                flat.y = 0f;
                if (flat.magnitude <= stop) HasGoal = false;
                else
                {
                    var face = Quaternion.LookRotation(flat.normalized);
                    actor.rotation = Quaternion.Slerp(actor.rotation, face, 8f * Time.deltaTime);
                    wish = flat.normalized * 3.1f;
                }
            }
            if (body.isGrounded && vy < 0f) vy = -1.5f;
            else vy -= 18f * Time.deltaTime;
            wish.y = vy;
            body.Move(wish * Time.deltaTime);
        }

        /// <summary>
        /// True when a uGUI graphic is under the cursor. Raycasts the canvases
        /// directly so the result does not depend on script order.
        /// </summary>
        public static bool IsOverUi()
        {
            var system = EventSystem.current;
            if (system == null) return false;
            if (_pointer == null || _pointerSystem != system)
            {
                _pointerSystem = system;
                _pointer = new PointerEventData(system);
            }
            _pointer.position = Input.mousePosition;
            UiHits.Clear();
            system.RaycastAll(_pointer, UiHits);
            return UiHits.Count > 0;
        }

        /// <summary>
        /// Nearest physics hit along the cursor, skipping the walker. The buffer is reused.
        /// </summary>
        public static bool FirstHit(Camera cam, Transform ignore, out RaycastHit hit, float maxDistance = 40f)
        {
            hit = default(RaycastHit);
            if (cam == null) return false;
            var count = Physics.RaycastNonAlloc(cam.ScreenPointToRay(Input.mousePosition), WorldHits, maxDistance);
            var best = float.PositiveInfinity;
            var found = false;
            for (var i = 0; i < count; i++)
            {
                var col = WorldHits[i].collider;
                if (col == null) continue;
                if (ignore != null && (col.transform == ignore || col.transform.IsChildOf(ignore))) continue;
                if (WorldHits[i].distance >= best) continue;
                best = WorldHits[i].distance;
                hit = WorldHits[i];
                found = true;
            }
            return found;
        }
    }
}
