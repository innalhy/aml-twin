import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ACESFilmicToneMapping, PerspectiveCamera, PCFShadowMap, Vector3, WebGLRenderer } from "three";
import { createEnvironment, disposeEnvironment, type SceneKind } from "./scene-environments";
import "./scene-viewport.css";

export type { SceneKind } from "./scene-environments";

export type SceneHotspot = { id: string; label: string; onActivate: () => void };

type CameraPosition = { angle: number; tilt: number; distance: number };
type ViewState = "loading" | "ready" | "fallback";
type CameraControl = "left" | "right" | "up" | "down" | "near" | "far" | "reset";
type Point = { x: number; y: number };

const ENVIRONMENTS = {
  onboarding: { name: "Private banking office", initial: { angle: 0.39, tilt: 0.25, distance: 10.8 }, target: [-0.72, 1.73, -1.78] as const },
  branch: { name: "Retail branch", initial: { angle: 0.23, tilt: 0.26, distance: 11.3 }, target: [-0.65, 1.79, -1.7] as const },
  monitoring: { name: "Transaction monitoring operations", initial: { angle: 0.20, tilt: 0.23, distance: 11.4 }, target: [0.08, 1.91, -2.2] as const },
};

const CONTROLS: { action: CameraControl; label: string; symbol: string }[] = [
  { action: "left", label: "Look left", symbol: "←" },
  { action: "right", label: "Look right", symbol: "→" },
  { action: "up", label: "Look up", symbol: "↑" },
  { action: "down", label: "Look down", symbol: "↓" },
  { action: "near", label: "Zoom in", symbol: "+" },
  { action: "far", label: "Zoom out", symbol: "−" },
  { action: "reset", label: "Reset view", symbol: "↺" },
];

function constrain(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(value, maximum));
}

function useRoomCamera(kind: SceneKind) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const marks = useRef<(HTMLDivElement | null)[]>([]);
  const update = useRef<() => void>(() => {});
  const wanted = useRef<CameraPosition>({ ...ENVIRONMENTS[kind].initial });
  const pointers = useRef(new Map<number, Point>());
  const [state, setState] = useState<ViewState>("loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const environment = ENVIRONMENTS[kind];
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" });
    } catch {
      setState("fallback");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = kind === "monitoring" ? 0.95 : 1.0;

    const { scene, anchors } = createEnvironment(kind);
    const camera = new PerspectiveCamera(47, 1, 0.1, 45);
    const target = new Vector3(...environment.target);
    const point = new Vector3();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const active: CameraPosition = { ...environment.initial };
    wanted.current = { ...environment.initial };
    let frame = 0;
    let stopped = false;

    function draw() {
      frame = 0;
      if (stopped) return;
      const desired = wanted.current;
      const easing = reducedMotion.matches ? 1 : 0.29;
      active.angle += (desired.angle - active.angle) * easing;
      active.tilt += (desired.tilt - active.tilt) * easing;
      active.distance += (desired.distance - active.distance) * easing;
      const levelDistance = Math.cos(active.tilt) * active.distance;
      camera.position.set(
        target.x + Math.sin(active.angle) * levelDistance,
        target.y + Math.sin(active.tilt) * active.distance,
        target.z + Math.cos(active.angle) * levelDistance,
      );
      camera.lookAt(target);
      renderer.render(scene, camera);
      for (const [index, anchor] of anchors.entries()) {
        const marker = marks.current[index];
        if (!marker) continue;
        point.copy(anchor).project(camera);
        const onscreen = point.z >= -1 && point.z <= 1 && Math.abs(point.x) < 0.92 && Math.abs(point.y) < 0.92;
        marker.style.visibility = onscreen ? "visible" : "hidden";
        if (!onscreen) continue;
        marker.style.left = `${50 + point.x * 50}%`;
        marker.style.top = `${50 - point.y * 50}%`;
      }
      const moving = Math.abs(desired.angle - active.angle) + Math.abs(desired.tilt - active.tilt) + Math.abs(desired.distance - active.distance) > 0.002;
      if (moving) frame = requestAnimationFrame(draw);
    }

    function schedule() {
      if (!frame && !stopped) frame = requestAnimationFrame(draw);
    }

    function resize() {
      const { clientWidth, clientHeight } = stage!;
      if (!clientWidth || !clientHeight) return;
      camera.aspect = clientWidth / clientHeight;
      camera.fov = camera.aspect < 1 ? 62 : camera.aspect < 1.35 ? 55 : 47;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
      schedule();
    }

    function contextLost(event: Event) {
      event.preventDefault();
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
      setState("fallback");
    }

    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    canvas.addEventListener("webglcontextlost", contextLost);
    update.current = schedule;
    resize();
    setState("ready");
    return () => {
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
      update.current = () => {};
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", contextLost);
      disposeEnvironment(scene);
      renderer.dispose();
    };
  }, [kind]);

  function nudge(angle: number, tilt: number, distance: number) {
    const position = wanted.current;
    position.angle = constrain(position.angle + angle, -0.80, 0.80);
    position.tilt = constrain(position.tilt + tilt, 0.07, 0.51);
    position.distance = constrain(position.distance + distance, 6.25, 15.6);
    update.current();
  }

  function control(action: CameraControl) {
    switch (action) {
      case "left": nudge(-0.16, 0, 0); break;
      case "right": nudge(0.16, 0, 0); break;
      case "up": nudge(0, -0.07, 0); break;
      case "down": nudge(0, 0.07, 0); break;
      case "near": nudge(0, 0, -1.2); break;
      case "far": nudge(0, 0, 1.2); break;
      case "reset":
        wanted.current = { ...ENVIRONMENTS[kind].initial };
        update.current();
    }
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || state !== "ready") return;
    const actions: Record<string, CameraControl> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", "+": "near", "=": "near", "-": "far", Home: "reset" };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      control(action);
    }
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (state !== "ready" || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === "mouse") event.currentTarget.focus({ preventScroll: true });
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    const other = Array.from(pointers.current).find(([id]) => id !== event.pointerId)?.[1];
    if (other) {
      const oldDistance = Math.hypot(other.x - previous.x, other.y - previous.y);
      const newDistance = Math.hypot(other.x - point.x, other.y - point.y);
      nudge(0, 0, (oldDistance - newDistance) * 0.025);
    } else {
      nudge((previous.x - point.x) * 0.0052, (point.y - previous.y) * 0.003, 0);
    }
  }

  function pointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
  }

  return { canvasRef, stageRef, marks, update, state, control, keyDown, pointerDown, pointerMove, pointerEnd };
}

export function SceneViewport({ kind, hotspots }: { kind: SceneKind; hotspots: readonly SceneHotspot[] }) {
  const camera = useRoomCamera(kind);
  const instructionsId = useId();
  const { state, update } = camera;
  const ready = state === "ready";
  const name = ENVIRONMENTS[kind].name;

  useEffect(() => { update.current(); }, [update, hotspots.length, state]);

  return <section className="twin-scene" aria-label={name} data-scene-state={state}>
    <div
      className={`twin-scene-stage twin-scene-stage--${kind}`}
      ref={camera.stageRef}
      tabIndex={ready ? 0 : undefined}
      aria-label={`${name} camera`}
      aria-describedby={ready ? instructionsId : undefined}
      onKeyDown={camera.keyDown}
      onPointerDown={camera.pointerDown}
      onPointerMove={camera.pointerMove}
      onPointerUp={camera.pointerEnd}
      onPointerCancel={camera.pointerEnd}
      onLostPointerCapture={camera.pointerEnd}
    >
      <canvas ref={camera.canvasRef} aria-hidden="true" />
      <div className="twin-scene-chrome" aria-hidden="true"><strong>{name}</strong><span>{ready ? "3D ENVIRONMENT" : "SIMULATION ENVIRONMENT"}</span></div>
      {state !== "ready" && <div className="twin-scene-status" role="status">{state === "loading" ? "Opening the scene…" : "3D view is unavailable here. Use the stations below to continue."}</div>}
      {ready && hotspots.slice(0, 4).map((hotspot, index) => <div className="twin-scene-marker" key={index} ref={(node) => { camera.marks.current[index] = node; }}>
        <button type="button" className="twin-scene-pin" aria-label={`Inspect ${hotspot.label}`} onClick={hotspot.onActivate}>
          <span className="twin-scene-number" aria-hidden="true">{index + 1}</span>
          <span className="twin-scene-marker-label" aria-hidden="true">{hotspot.label}</span>
        </button>
      </div>)}
    </div>
    {ready && <div className="twin-scene-navigation">
      <p id={instructionsId}>Drag to look around. Pinch or use the zoom controls. The focused scene also supports the arrow keys.</p>
      <div className="twin-scene-controls" role="group" aria-label="Camera controls">
        {CONTROLS.map(({ action, label, symbol }) => <button type="button" aria-label={label} title={label} key={action} onClick={() => camera.control(action)}>{symbol}</button>)}
      </div>
    </div>}
    {hotspots.length > 0 && <div className="twin-scene-stations" role="group" aria-label="Scene stations">
      {hotspots.map((hotspot, index) => <button type="button" key={hotspot.id} onClick={hotspot.onActivate}><span className="twin-scene-number" aria-hidden="true">{index + 1}</span>{hotspot.label}</button>)}
    </div>}
  </section>;
}
