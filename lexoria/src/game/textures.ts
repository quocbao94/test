import Phaser from "phaser";
import { CLASSES, type ClassId } from "../lib/classes";
import { TILE, TILE_COUNT } from "./maps";

/**
 * All art is drawn procedurally on canvases at boot so the MVP ships with no binary assets.
 * Swap these for a real tileset/sprite sheet later without touching scene logic.
 */

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function speckle(ctx: Ctx, ox: number, colors: string[], seed: number, count: number) {
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280;
    const x = s % TILE;
    s = (s * 9301 + 49297) % 233280;
    const y = s % TILE;
    px(ctx, colors[i % colors.length], ox + x, y);
  }
}

const TILE_PAINTERS: ((ctx: Ctx, ox: number) => void)[] = [
  // Grass
  (c, o) => {
    px(c, "#5fae4f", o, 0, TILE, TILE);
    speckle(c, o, ["#6cc25a", "#4f9a43"], 7, 14);
  },
  // Grass alt
  (c, o) => {
    px(c, "#5fae4f", o, 0, TILE, TILE);
    speckle(c, o, ["#7bd067", "#4f9a43", "#6cc25a"], 31, 22);
    px(c, "#4f9a43", o + 4, 9, 1, 3);
    px(c, "#4f9a43", o + 11, 4, 1, 3);
  },
  // Path
  (c, o) => {
    px(c, "#d8b878", o, 0, TILE, TILE);
    speckle(c, o, ["#c9a566", "#e6cb92"], 13, 18);
  },
  // Tree
  (c, o) => {
    px(c, "#5fae4f", o, 0, TILE, TILE);
    px(c, "#6b4423", o + 7, 11, 3, 5);
    c.fillStyle = "#2f6e35";
    c.beginPath();
    c.arc(o + 8, 7, 7, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#3f8b45";
    c.beginPath();
    c.arc(o + 6, 5, 4, 0, Math.PI * 2);
    c.fill();
    px(c, "#5aa85c", o + 5, 3, 2, 1);
  },
  // Water
  (c, o) => {
    px(c, "#3c7fc4", o, 0, TILE, TILE);
    px(c, "#6aa8e6", o + 2, 4, 4, 1);
    px(c, "#6aa8e6", o + 9, 10, 5, 1);
    px(c, "#2f6aa6", o + 5, 13, 3, 1);
  },
  // Wall
  (c, o) => {
    px(c, "#e9dcc0", o, 0, TILE, TILE);
    for (let y = 3; y < TILE; y += 4) px(c, "#cdbb98", o, y, TILE, 1);
    px(c, "#7aa0c8", o + 3, 5, 4, 4);
    px(c, "#5b4630", o + 3, 5, 4, 1);
  },
  // Roof
  (c, o) => {
    px(c, "#a8443c", o, 0, TILE, TILE);
    for (let y = 2; y < TILE; y += 4) px(c, "#8c342e", o, y, TILE, 1);
    px(c, "#c25a50", o, 0, TILE, 1);
  },
  // Door
  (c, o) => {
    px(c, "#e9dcc0", o, 0, TILE, TILE);
    px(c, "#6b4423", o + 4, 3, 8, 13);
    px(c, "#8a5a30", o + 5, 4, 6, 12);
    px(c, "#f4d58d", o + 9, 10, 1, 1);
  },
  // Gate
  (c, o) => {
    px(c, "#d8b878", o, 0, TILE, TILE);
    for (let x = 1; x < TILE; x += 4) px(c, "#6b4423", o + x, 1, 2, 15);
    px(c, "#5b3a1e", o, 4, TILE, 2);
    px(c, "#5b3a1e", o, 11, TILE, 2);
  },
  // Flowers
  (c, o) => {
    px(c, "#5fae4f", o, 0, TILE, TILE);
    for (const [x, y, col] of [
      [3, 4, "#f2e05c"],
      [10, 3, "#f28cb1"],
      [6, 10, "#ffffff"],
      [12, 11, "#f2e05c"],
    ] as const) {
      px(c, col, o + x, y, 2, 2);
      px(c, "#3f8b45", o + x, y + 2, 1, 2);
    }
  },
  // Exit (glowing path)
  (c, o) => {
    px(c, "#d8b878", o, 0, TILE, TILE);
    px(c, "#f4e3a1", o + 3, 3, 10, 10);
    px(c, "#fff6dc", o + 6, 6, 4, 4);
  },
];

function canvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (c: Ctx) => void,
) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h)!;
  draw(tex.getContext());
  tex.refresh();
}

function person(c: Ctx, body: string, hair: string, skin = "#f2c9a0", extra?: (c: Ctx) => void) {
  px(c, "rgba(0,0,0,0.25)", 4, 14, 8, 2);
  px(c, hair, 4, 1, 8, 4); // hair
  px(c, skin, 5, 3, 6, 5); // face
  px(c, "#222", 6, 5, 1, 1);
  px(c, "#222", 9, 5, 1, 1);
  px(c, body, 4, 8, 8, 5); // body
  px(c, skin, 3, 9, 1, 3);
  px(c, skin, 12, 9, 1, 3);
  px(c, "#3b3b52", 5, 13, 2, 2); // legs
  px(c, "#3b3b52", 9, 13, 2, 2);
  extra?.(c);
}

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

export function playerTextureKey(cls: ClassId) {
  return `player-${cls}`;
}

export function createTextures(scene: Phaser.Scene) {
  canvasTexture(scene, "tiles", TILE * TILE_COUNT, TILE, (c) =>
    TILE_PAINTERS.forEach((paint, i) => paint(c, i * TILE)),
  );

  for (const cls of CLASSES) {
    canvasTexture(scene, playerTextureKey(cls.id), 16, 16, (c) =>
      person(c, hex(cls.color), "#4a3222", undefined, (c2) => px(c2, "#f4d58d", 7, 9, 2, 2)),
    );
  }

  canvasTexture(scene, "npc-elder", 16, 16, (c) =>
    person(c, "#6d5a8c", "#e0e0e0", undefined, (c2) => {
      px(c2, "#e0e0e0", 6, 7, 4, 3); // beard
      px(c2, "#8a5a30", 13, 4, 1, 11); // staff
    }),
  );
  canvasTexture(scene, "npc-questmaster", 16, 16, (c) =>
    person(c, "#2f8f83", "#c0602a", undefined, (c2) => px(c2, "#fff6dc", 0, 8, 3, 4)),
  );
  canvasTexture(scene, "npc-guard", 16, 16, (c) =>
    person(c, "#8d99ae", "#5c677d", undefined, (c2) => {
      px(c2, "#adb5bd", 4, 0, 8, 2); // helmet
      px(c2, "#ced4da", 13, 2, 1, 12); // spear
      px(c2, "#adb5bd", 12, 1, 3, 2);
    }),
  );

  // Word monsters, one look per topic
  canvasTexture(scene, "mon-environment", 16, 16, (c) => {
    px(c, "rgba(0,0,0,0.25)", 3, 14, 10, 2);
    c.fillStyle = "#5bbf5b";
    c.beginPath();
    c.ellipse(8, 10, 7, 5, 0, 0, Math.PI * 2);
    c.fill();
    px(c, "#7fd97f", 4, 7, 3, 2);
    px(c, "#fff", 5, 9, 2, 2);
    px(c, "#fff", 10, 9, 2, 2);
    px(c, "#222", 6, 10, 1, 1);
    px(c, "#222", 11, 10, 1, 1);
    px(c, "#3a8a3a", 7, 3, 2, 3); // sprout
    px(c, "#7fd97f", 9, 3, 2, 1);
  });
  canvasTexture(scene, "mon-technology", 16, 16, (c) => {
    px(c, "rgba(0,0,0,0.25)", 3, 14, 10, 2);
    px(c, "#4fa3e0", 4, 5, 8, 8);
    px(c, "#2b6fa3", 4, 9, 8, 1);
    for (const y of [6, 9, 12]) {
      px(c, "#1f3b57", 2, y, 2, 1);
      px(c, "#1f3b57", 12, y, 2, 1);
    }
    px(c, "#ff5e5e", 5, 6, 2, 2);
    px(c, "#ff5e5e", 9, 6, 2, 2);
    px(c, "#f4d58d", 7, 2, 1, 3);
    px(c, "#f4d58d", 8, 2, 1, 1);
  });
  canvasTexture(scene, "mon-education", 16, 16, (c) => {
    px(c, "rgba(0,0,0,0.25)", 3, 14, 10, 2);
    px(c, "#8c4a1e", 2, 3, 12, 10);
    px(c, "#d98e3f", 3, 4, 10, 8);
    px(c, "#fff6dc", 7, 4, 2, 8);
    px(c, "#222", 5, 7, 1, 2);
    px(c, "#222", 10, 7, 1, 2);
    px(c, "#8c2f39", 5, 10, 6, 1);
  });

  canvasTexture(scene, "boss", 32, 32, (c) => {
    px(c, "rgba(0,0,0,0.3)", 4, 28, 24, 4);
    px(c, "#4a4e69", 6, 6, 20, 22);
    px(c, "#22223b", 6, 6, 20, 2);
    px(c, "#9a8c98", 8, 10, 16, 2);
    px(c, "#ff3c3c", 10, 13, 4, 3);
    px(c, "#ff3c3c", 18, 13, 4, 3);
    px(c, "#22223b", 10, 20, 12, 2);
    for (let x = 8; x < 24; x += 4) px(c, "#f4d58d", x, 2, 2, 4); // crown
    px(c, "#4a4e69", 2, 12, 4, 10);
    px(c, "#4a4e69", 26, 12, 4, 10);
  });

  canvasTexture(scene, "anvil", 16, 16, (c) => {
    px(c, "rgba(0,0,0,0.25)", 3, 14, 10, 2);
    px(c, "#495057", 2, 6, 12, 3);
    px(c, "#343a40", 5, 9, 6, 3);
    px(c, "#495057", 3, 12, 10, 2);
    px(c, "#ff8c42", 6, 3, 2, 3);
    px(c, "#ffd166", 7, 2, 1, 2);
  });

  canvasTexture(scene, "alert", 6, 8, (c) => {
    px(c, "#fff6dc", 0, 0, 6, 8);
    px(c, "#d62828", 2, 1, 2, 4);
    px(c, "#d62828", 2, 6, 2, 1);
  });
}
