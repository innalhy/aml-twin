using UnityEngine;
using UnityEngine.EventSystems;

namespace TwinAml
{
    /// <summary>
    /// Kept so older call sites still compile. The branch and the monitoring room
    /// use PointerView: drag to look, click the floor to walk, click an object to use it.
    /// </summary>
    public static class MouseWalk
    {
        public static void Step(CharacterController body, Transform actor, bool blocked, ref float vy)
        {
            if (body == null || actor == null) return;
            var overUi = EventSystem.current != null && EventSystem.current.IsPointerOverGameObject();
            var forward = !blocked && !overUi && Input.GetMouseButton(0);
            var back = !blocked && !overUi && Input.GetMouseButton(1);
            if (forward || back)
            {
                var yaw = actor.eulerAngles.y + Input.GetAxis("Mouse X") * 90f;
                actor.rotation = Quaternion.Euler(0f, yaw, 0f);
            }
            var facing = actor.forward;
            facing.y = 0f;
            if (facing.sqrMagnitude < 0.0001f) facing = Vector3.forward;
            facing.Normalize();
            var wish = Vector3.zero;
            if (forward && !back) wish = facing;
            else if (back && !forward) wish = -facing;
            if (body.isGrounded && vy < 0f) vy = -1.5f;
            else vy -= 18f * Time.deltaTime;
            var motion = wish * 3.1f;
            motion.y = vy;
            body.Move(motion * Time.deltaTime);
        }
    }
}
