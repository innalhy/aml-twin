import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type SceneKind = "onboarding" | "branch" | "monitoring";
type XYZ = [number, number, number];
type Surface = T.ColorRepresentation | T.Material;

const WOOD = "#76513d";
const LIGHT_WOOD = "#ae8260";
const BRASS = "#a98349";

function workshop(scene: T.Scene) {
  const materials = new Map<T.ColorRepresentation, T.MeshStandardMaterial>();
  function material(value: Surface) {
    if (value instanceof T.Material) return value;
    let existing = materials.get(value);
    if (!existing) {
      existing = new T.MeshStandardMaterial({ color: value, roughness: 0.76 });
      materials.set(value, existing);
    }
    return existing;
  }
  function shape(geometry: T.BufferGeometry, position: XYZ, color: Surface, parent: T.Object3D = scene) {
    const mesh = new T.Mesh(geometry, material(color));
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function box(size: XYZ, position: XYZ, color: Surface, parent?: T.Object3D) {
    return shape(new T.BoxGeometry(...size), position, color, parent);
  }
  function tube(top: number, bottom: number, height: number, position: XYZ, color: Surface, parent?: T.Object3D) {
    return shape(new T.CylinderGeometry(top, bottom, height, 20), position, color, parent);
  }
  function group(position: XYZ, yaw = 0) {
    const result = new T.Group();
    result.position.set(...position);
    result.rotation.y = yaw;
    scene.add(result);
    return result;
  }
  return { box, tube, shape, group };
}
type Workshop = ReturnType<typeof workshop>;

function graphic(width: number, height: number, paint: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return new T.MeshBasicMaterial({ color: "#14293e" });
  paint(context);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 4;
  return new T.MeshBasicMaterial({ map });
}

function display(w: Workshop, width: number, height: number, position: XYZ, content: T.Material, parent?: T.Object3D) {
  w.box([width + 0.12, height + 0.12, 0.10], position, "#202832", parent);
  const face = w.shape(new T.PlaneGeometry(width, height), [position[0], position[1], position[2] + 0.052], content, parent);
  face.castShadow = false;
}

function titlePanel(title: string, subtitle: string, accent: string, background = "#18324d") {
  return graphic(512, 160, (ctx) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 512, 160);
    ctx.fillStyle = accent;
    ctx.fillRect(22, 24, 5, 110);
    ctx.font = "bold 35px system-ui, sans-serif";
    ctx.fillStyle = "#f1f5f9";
    ctx.fillText(title, 46, 76);
    ctx.font = "17px system-ui, sans-serif";
    ctx.fillStyle = accent;
    ctx.fillText(subtitle, 47, 110);
  });
}

function skyline(dusk: boolean) {
  return graphic(900, 440, (ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, 440);
    sky.addColorStop(0, dusk ? "#365077" : "#7fadc9");
    sky.addColorStop(1, dusk ? "#d49478" : "#e5e8df");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 900, 440);
    ctx.fillStyle = dusk ? "#646983" : "#9faeb8";
    ctx.beginPath();
    ctx.moveTo(0, 340);
    ctx.lineTo(105, 208);
    ctx.lineTo(220, 172);
    ctx.lineTo(365, 275);
    ctx.lineTo(485, 233);
    ctx.lineTo(650, 318);
    ctx.lineTo(900, 200);
    ctx.lineTo(900, 440);
    ctx.lineTo(0, 440);
    ctx.fill();
    for (let i = 0; i < 18; i++) {
      const x = i * 53 - 12;
      const top = 180 + ((i * 139) % 139 + (i * 41) % 147) - (i === 11 ? 100 : 0);
      const width = 32 + ((i * 7) % 18);
      ctx.fillStyle = (dusk ? ["#222e46", "#293d57", "#344760"] : ["#5d768a", "#839bad", "#697f91"])[i % 3];
      ctx.fillRect(x, top, width, 440 - top);
      ctx.fillStyle = dusk ? "#e3ba88" : "#c1d8df";
      for (let y = top + 10; y < 438; y += 14) {
        for (let k = 6; k + 6 < width; k += 9) {
          if ((k * y + i) % 7 < 4) ctx.fillRect(x + k, y, 3, 4);
        }
      }
    }
    ctx.fillStyle = dusk ? "#374965" : "#90b2c2";
    ctx.fillRect(0, 406, 900, 34);
  });
}

function chart(mode: "alert" | "evidence" | "assessment" | "review") {
  const title = { alert: "TRANSACTION QUEUE", evidence: "EVIDENCE REGISTER", assessment: "ASSESSMENT DESK", review: "REVIEW STATION" }[mode];
  const accent = { alert: "#56b9fd", evidence: "#64e4c1", assessment: "#dfb47a", review: "#a39afe" }[mode];
  return graphic(640, 350, (ctx) => {
    ctx.fillStyle = "#101b2a";
    ctx.fillRect(0, 0, 640, 350);
    ctx.fillStyle = "#1d2c40";
    ctx.fillRect(0, 0, 640, 58);
    ctx.font = "bold 19px system-ui, sans-serif";
    ctx.fillStyle = accent;
    ctx.fillText(title, 26, 37);
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillStyle = "#9cb0c9";
    ctx.fillText("TWINAML   /   TRAINING", 456, 36);
    ctx.fillStyle = "#172538";
    ctx.fillRect(24, 83, 346, 237);
    ctx.fillRect(385, 83, 231, 237);
    if (mode === "evidence" || mode === "review") {
      const nodes = [[71, 171], [156, 128], [195, 220], [291, 155], [311, 258], [112, 275]];
      ctx.strokeStyle = "#537b8e";
      for (let i = 0; i < nodes.length; i++) {
        ctx.beginPath();
        ctx.moveTo(nodes[i][0], nodes[i][1]);
        ctx.lineTo(nodes[(i + 2) % nodes.length][0], nodes[(i + 2) % nodes.length][1]);
        ctx.stroke();
      }
      nodes.forEach(([x, y], index) => {
        ctx.beginPath();
        ctx.arc(x, y, index === 2 ? 11 : 6, 0, Math.PI * 2);
        ctx.fillStyle = index === 2 ? accent : "#5e7f97";
        ctx.fill();
      });
    } else {
      ctx.strokeStyle = "#294056";
      for (let y = 119; y < 304; y += 34) {
        ctx.beginPath(); ctx.moveTo(44, y); ctx.lineTo(349, y); ctx.stroke();
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const values = [250, 225, 236, 182, 195, 166, 177, 117, 143, 112];
      values.forEach((value, i) => i ? ctx.lineTo(46 + i * 32, value) : ctx.moveTo(46, value));
      ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i === 0 ? accent : "#7892ad";
      ctx.fillRect(403, 109 + i * 27, 43 + (i * 31) % 87, 5);
      ctx.fillStyle = "#35536c";
      ctx.fillRect(550, 109 + i * 27, 44, 5);
    }
  });
}

function lights(scene: T.Scene, kind: SceneKind) {
  const dark = kind === "monitoring";
  scene.background = new T.Color(dark ? "#111e2e" : "#d3dae1");
  scene.add(new T.HemisphereLight(dark ? "#8caefa" : "#ffffff", dark ? "#4f506e" : "#998b83", dark ? 1.28 : 2.04));
  const sun = new T.DirectionalLight(dark ? "#a7cbff" : "#fff4df", dark ? 1.65 : 2.3);
  sun.position.set(3.2, 9.5, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 9, bottom: -9, far: 27 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.00015;
  scene.add(sun);
  if (dark) {
    const fill = new T.DirectionalLight("#c7d9f6", 1.35);
    fill.position.set(-3, 4, 7);
    scene.add(fill);
  }
}

function room(w: Workshop, floor: string, wall: string, trim: string) {
  w.box([14.2, 0.2, 11.2], [0, -0.11, -0.3], floor);
  w.box([14.2, 4.9, 0.2], [0, 2.45, -5.85], wall);
  w.box([0.2, 4.9, 9.1], [-7, 2.45, -1.32], wall);
  w.box([14, 0.19, 0.09], [0, 0.11, -5.69], trim);
  w.box([0.1, 0.19, 9], [-6.86, 0.11, -1.29], trim);
  w.box([14, 0.20, 0.25], [0, 4.78, -5.65], trim);
  w.box([0.23, 0.20, 9], [-6.85, 4.78, -1.29], trim);
}

function plant(w: Workshop, x: number, z: number, scale = 1, pot = "#aaa393") {
  w.tube(0.31 * scale, 0.23 * scale, 0.43 * scale, [x, 0.215 * scale, z], pot);
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.399;
    const length = 0.36 + (i % 4) * 0.055;
    const leaf = w.shape(new T.SphereGeometry(1, 9, 6), [x + Math.cos(angle) * length * scale, (0.73 + (i % 4) * 0.14) * scale, z + Math.sin(angle) * length * scale], ["#3d6344", "#537751", "#31553d"][i % 3]);
    leaf.scale.set(0.38 * scale, 0.095 * scale, 0.15 * scale);
    leaf.rotation.set(0, -angle, (i % 2 ? 1 : -1) * 0.53);
  }
  w.tube(0.027 * scale, 0.052 * scale, 0.81 * scale, [x, 0.68 * scale, z], "#626843");
}

function chair(w: Workshop, x: number, z: number, yaw: number, color: string, legs: string, office = false) {
  const seat = w.group([x, 0, z], yaw);
  w.box([0.91, 0.16, 0.87], [0, 0.54, 0], color, seat);
  const back = w.box([0.90, office ? 0.91 : 0.60, 0.16], [0, office ? 1.03 : 0.9, -0.39], color, seat);
  back.rotation.x = -0.09;
  for (const side of [-1, 1]) {
    w.box([0.11, 0.11, 0.78], [side * 0.45, 0.78, -0.01], color, seat);
    w.box([0.07, 0.24, 0.07], [side * 0.45, 0.66, 0.20], legs, seat);
  }
  if (office) {
    w.tube(0.079, 0.095, 0.45, [0, 0.26, 0], legs, seat);
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      const support = w.box([0.085, 0.055, 0.48], [Math.sin(angle) * 0.19, 0.09, Math.cos(angle) * 0.19], legs, seat);
      support.rotation.y = angle;
    }
  } else {
    for (const xLeg of [-0.34, 0.34]) for (const zLeg of [-0.31, 0.31]) {
      w.box([0.075, 0.48, 0.075], [xLeg, 0.24, zLeg], legs, seat);
    }
  }
}

function windowWall(w: Workshop, x: number, width: number, color: string, dusk = false) {
  display(w, width, 2.87, [x, 2.8, -5.66], skyline(dusk));
  for (let i = 0; i <= 4; i++) {
    w.box([0.06, 2.98, 0.12], [x - width / 2 + i * width / 4, 2.80, -5.53], color);
  }
  w.box([width + 0.27, 0.13, 0.28], [x, 1.32, -5.51], color);
}

function files(w: Workshop, x: number, y: number, z: number, color = "#566d82") {
  w.box([0.44, 0.03, 0.32], [x, y + 0.015, z], color);
  w.box([0.37, 0.021, 0.28], [x + 0.012, y + 0.043, z + 0.021], "#eee7d6").rotation.y = -0.11;
  for (let i = 0; i < 4; i++) w.box([0.18 - i * 0.011, 0.001, 0.012], [x + 0.007, y + 0.055, z - 0.067 + i * 0.042], "#9ba3a4");
}

function office(w: Workshop) {
  room(w, "#72584a", "#c2ac91", "#82604c");
  for (let i = 0; i < 20; i++) {
    const color = ["#8f6951", "#8a624c", "#976f55", "#825d49"][i % 4];
    w.box([0.691, 0.014, 11.15], [i * 0.699 - 6.65, 0, -0.3], color);
  }
  windowWall(w, 2.9, 6.45, "#523a30", true);
  const bookshelfX = -3.8;
  w.box([4.0, 4.14, 0.47], [bookshelfX, 2.11, -5.44], "#583d30");
  for (const x of [-5.8, -3.8, -1.8]) w.box([0.15, 4.25, 0.75], [x, 2.12, -5.28], WOOD);
  for (let level = 0; level < 5; level++) {
    const y = 0.38 + level * 0.84;
    w.box([4.08, 0.12, 0.74], [bookshelfX, y, -5.27], WOOD);
    for (let j = 0; j < 14; j++) {
      if (j % 7 === 6 || (j + level * 2) % 9 === 5) continue;
      const h = 0.37 + ((j * 13 + level * 9) % 22) / 100;
      const x = -5.55 + j * 0.26 + (j > 6 ? 0.21 : 0);
      const palette = ["#6e4141", "#394f51", "#72624a", "#566878", "#a18868", "#766d5c"];
      w.box([0.19, h, 0.37], [x, y + 0.06 + h / 2, -5.19], palette[(j + level * 2) % palette.length]);
      w.box([0.135, 0.02, 0.005], [x, y + h * 0.76, -4.999], "#af9a77");
    }
  }
  w.box([5.8, 0.045, 5.45], [-0.2, 0.02, 0.28], "#bcb09c");
  w.box([5.58, 0.018, 5.22], [-0.2, 0.05, 0.28], "#625d60");
  w.box([5.43, 0.016, 5.07], [-0.2, 0.064, 0.28], "#c0b39e");
  for (let i = 0; i < 28; i++) w.box([0.026, 0.002, 4.98], [-2.82 + i * 0.194, 0.075, 0.28], "#baae98");
  w.box([3.66, 0.16, 1.56], [0.1, 1.05, -1.35], WOOD);
  w.box([3.78, 0.045, 1.68], [0.1, 1.151, -1.35], "#91684f");
  for (const x of [-1.34, 1.53]) {
    w.box([0.58, 0.94, 1.41], [x, 0.54, -1.35], "#6c4c3b");
    for (let i = 0; i < 3; i++) {
      w.box([0.46, 0.22, 0.07], [x, 0.28 + i * 0.24, -0.61], WOOD);
      w.box([0.18, 0.021, 0.035], [x, 0.3 + i * 0.24, -0.56], BRASS);
    }
  }
  w.box([2.8, 0.44, 0.09], [0.08, 0.77, -0.66], "#6c4c3b");
  chair(w, 0.16, -2.58, 0, "#34404b", "#485159", true);
  chair(w, -1.07, 0.88, Math.PI + 0.25, "#ded2bc", WOOD);
  chair(w, 1.2, 0.72, Math.PI - 0.23, "#d7c8b1", WOOD);
  files(w, 0.92, 1.178, -0.98, "#596d72");
  const computer = w.group([-0.25, 1.18, -1.43], 0);
  w.box([0.72, 0.043, 0.48], [0, 0.024, 0], "#344151", computer);
  display(w, 0.64, 0.38, [0, 0.23, -0.19], chart("assessment"), computer);
  w.tube(0.19, 0.2, 0.038, [-1.17, 1.20, -1.68], BRASS);
  w.tube(0.034, 0.038, 0.46, [-1.17, 1.43, -1.68], BRASS);
  w.tube(0.15, 0.29, 0.23, [-1.17, 1.69, -1.68], "#dfc49d");
  w.box([2.13, 0.74, 0.65], [-3.91, 0.39, -2.13], "#75543f");
  w.box([2.23, 0.07, 0.74], [-3.91, 0.79, -2.13], LIGHT_WOOD);
  files(w, -3.87, 0.826, -1.98, "#80644a");
  // The wall sign is mounted facing into the room.
  const sign = w.group([-6.8, 2.90, -1.11], Math.PI / 2);
  display(w, 2.25, 0.72, [0, 0, 0], titlePanel("PRIVATE CLIENTS", "TWINAML  /  CLIENT SERVICES", "#d7b886"), sign);
  plant(w, 4.7, -3.68, 1.44, "#c6bba7");
  plant(w, -5.43, 0.37, 1.18, "#bcad97");
  return [[-0.63, 1.05, 1.0], [-3.74, 1.25, -1.95], [0.43, 1.6, -1.08], [-2.98, 3.72, -4.88]] satisfies XYZ[];
}

function branch(w: Workshop) {
  room(w, "#b3b9bf", "#dfe5e8", "#9eaebd");
  for (let row = 0; row < 9; row++) for (let col = 0; col < 12; col++) {
    const color = ["#cbd1d4", "#d5d9d9", "#d4d8db", "#c4cdd3"][(row * 3 + col) % 4];
    w.box([1.158, 0.018, 1.21], [-6.40 + col * 1.165, 0.004, -5.22 + row * 1.227], color);
  }
  windowWall(w, 3.37, 5.92, "#a0b1bf");
  display(w, 5.8, 1.35, [-3.26, 3.62, -5.66], titlePanel("TWINAML  /  RETAIL BANKING", "CLIENT SERVICE  •  COUNTER 01–03", "#8ed6f2", "#245072"));
  for (const [index, x] of [-4.18, -0.75, 2.72].entries()) {
    w.box([2.90, 0.99, 0.91], [x, 0.50, -2.75], "#bd9b7a");
    w.box([2.98, 0.11, 1.02], [x, 1.035, -2.75], "#e6e5dc");
    w.box([2.65, 0.58, 0.035], [x, 0.46, -2.275], "#aa886a");
    w.box([2.55, 0.035, 0.04], [x, 0.68, -2.25], "#ead6b8");
    const screen = w.group([x + 0.34, 1.11, -2.9], 0);
    w.box([0.33, 0.034, 0.30], [0, 0.015, 0.012], "#53626c", screen);
    w.box([0.09, 0.26, 0.075], [0, 0.155, -0.04], "#53626c", screen);
    display(w, 0.59, 0.37, [0, 0.38, 0], index === 2 ? chart("assessment") : chart("evidence"), screen);
    chair(w, x, -3.87, 0, "#34516a", "#606f79", true);
    if (index < 2) {
      const glass = new T.MeshPhysicalMaterial({ color: "#8cb4c3", transparent: true, opacity: 0.37, roughness: 0.32, metalness: 0.10, depthWrite: false });
      const divider = w.box([0.037, 0.51, 0.88], [x + 1.36, 1.36, -2.75], glass);
      divider.castShadow = false;
    }
  }
  files(w, -3.45, 1.092, -2.49, "#426886");
  chair(w, -4.25, 1.36, Math.PI + 0.14, "#6985a0", "#576879");
  chair(w, -3.17, 1.37, Math.PI + 0.14, "#6985a0", "#576879");
  w.tube(0.44, 0.44, 0.09, [-2.09, 0.55, 1.51], "#be9d7d");
  w.tube(0.06, 0.17, 0.51, [-2.09, 0.28, 1.51], "#596977");
  files(w, -2.1, 0.6, 1.50, "#7191a7");
  for (const x of [0.5, 2.6, 4.7]) {
    w.tube(0.15, 0.18, 0.06, [x, 0.042, 0.87], "#758694");
    w.tube(0.041, 0.048, 0.90, [x, 0.47, 0.87], "#a9b9c7");
    w.tube(0.095, 0.093, 0.10, [x, 0.94, 0.87], "#687e93");
  }
  w.box([4.2, 0.082, 0.028], [2.6, 0.94, 0.87], "#355979");
  w.box([1.8, 0.026, 1.0], [0.85, 0.029, 3.5], "#8da3b4");
  plant(w, 5.43, -1.77, 1.36, "#d0d5d9");
  plant(w, -5.8, -4.28, 1.34, "#b1bfc9");
  return [[-2.18, 1.18, 1.62], [-3.61, 1.53, -2.28], [2.66, 1.83, -2.38], [-2.32, 3.59, -5.44]] satisfies XYZ[];
}

function monitoring(w: Workshop) {
  room(w, "#344251", "#27364d", "#4f6380");
  for (let row = 0; row < 6; row++) {
    w.box([13.8, 0.003, 0.018], [0, 0.009, -4.9 + row * 1.85], "#435267");
    w.box([0.018, 0.003, 11.0], [-6.8 + row * 2.65, 0.008, -0.3], "#435267");
  }
  const glow = new T.MeshBasicMaterial({ color: "#67a4cf" });
  w.box([13.5, 0.044, 0.063], [0, 4.18, -5.63], glow);
  w.box([13.5, 0.043, 0.063], [0, 1.34, -5.63], glow);
  w.box([0.043, 0.043, 8.1], [-6.83, 1.34, -1.6], glow);
  for (const x of [-6.25, -3.1, 0, 3.1, 6.25]) w.box([0.18, 4.34, 0.26], [x, 2.24, -5.60], "#344559");
  for (const [index, x] of [-4.72, -1.57, 1.57, 4.72].entries()) {
    display(w, 2.74, 1.56, [x, 2.99, -5.41], chart((["alert", "evidence", "assessment", "review"] as const)[index]));
  }
  display(w, 2.40, 0.55, [-0.07, 1.88, -5.52], titlePanel("MONITORING OPERATIONS", "TWINAML  /  INVESTIGATION", "#83c7f4", "#172a42"));
  for (const [index, x] of [-3.86, -1.24, 1.43, 4.11].entries()) {
    const z = index === 0 || index === 3 ? -1.30 : -1.7;
    w.box([2.41, 0.13, 1.44], [x, 0.97, z], "#526275");
    w.box([2.41, 0.051, 0.043], [x, 1.03, z + 0.73], "#7695b4");
    w.box([1.87, 0.61, 0.11], [x, 0.56, z - 0.38], "#26364a");
    for (const side of [-1, 1]) w.box([0.12, 0.93, 1.15], [x + side * 1.08, 0.48, z], "#334459");
    const screen = w.group([x, 1.044, z - 0.12], 0);
    w.box([0.47, 0.033, 0.28], [0, 0.015, 0.12], "#27384c", screen);
    w.box([0.09, 0.23, 0.09], [0, 0.14, 0], "#607487", screen);
    display(w, 1.25, 0.72, [0, 0.47, 0], chart((["alert", "evidence", "assessment", "review"] as const)[index]), screen);
    w.box([0.62, 0.034, 0.20], [x - 0.06, 1.052, z + 0.38], "#293849");
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 11; col++) w.box([0.035, 0.004, 0.041], [x - 0.31 + col * 0.049, 1.071, z + 0.323 + row * 0.052], "#56677b");
    }
    w.tube(0.06, 0.06, 0.036, [x + 0.39, 1.056, z + 0.35], "#34455d");
    chair(w, x - 0.23, z + 1.59, Math.PI + (index % 2 ? -0.19 : 0.11), "#293545", "#687789", true);
  }
  for (const x of [-5.76, 5.73]) {
    w.box([1.03, 2.68, 0.87], [x, 1.34, -4.28], "#1d2939");
    for (let i = 0; i < 10; i++) {
      w.box([0.82, 0.11, 0.035], [x, 0.40 + i * 0.19, -3.826], "#53677b");
      w.box([0.07, 0.036, 0.013], [x + 0.29, 0.40 + i * 0.19, -3.802], glow);
    }
  }
  return [[-3.85, 1.96, -1.32], [-1.24, 1.96, -1.71], [1.45, 1.96, -1.71], [4.13, 1.96, -1.32]] satisfies XYZ[];
}

export function createEnvironment(kind: SceneKind) {
  const scene = new T.Scene();
  const build = workshop(scene);
  lights(scene, kind);
  const positions = { onboarding: office, branch, monitoring }[kind](build);
  batchStaticMeshes(scene);
  return { scene, anchors: positions.map((p) => new T.Vector3(...p)) };
}

// Group opaque room details by material and shadow behavior to keep camera movement cheap.
function batchStaticMeshes(scene: T.Scene) {
  const batches = new Map<string, { material: T.Material; meshes: T.Mesh[] }>();
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (!(object instanceof T.Mesh) || Array.isArray(object.material) || object.material.transparent) return;
    const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
    const batch = batches.get(key);
    if (batch) batch.meshes.push(object);
    else batches.set(key, { material: object.material, meshes: [object] });
  });

  for (const { material, meshes } of batches.values()) {
    if (meshes.length === 1) continue;
    const transformed = meshes.map((mesh) => mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
    const merged = mergeGeometries(transformed);
    transformed.forEach((geometry) => geometry.dispose());
    if (!merged) continue;
    const batch = new T.Mesh(merged, material);
    batch.castShadow = meshes[0].castShadow;
    batch.receiveShadow = meshes[0].receiveShadow;
    scene.add(batch);
    meshes.forEach((mesh) => {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    });
  }
}

export function disposeEnvironment(scene: T.Scene) {
  const materials = new Set<T.Material>();
  scene.traverse((object) => {
    if (object instanceof T.Mesh) {
      object.geometry.dispose();
      const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
      meshMaterials.forEach((material) => materials.add(material));
    }
    if (object instanceof T.DirectionalLight) object.shadow.dispose();
  });
  materials.forEach((material) => {
    if (material instanceof T.MeshBasicMaterial || material instanceof T.MeshStandardMaterial) material.map?.dispose();
    material.dispose();
  });
}
