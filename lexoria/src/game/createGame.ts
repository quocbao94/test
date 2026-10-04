import Phaser from "phaser";
import { WorldScene } from "./WorldScene";

let current: Phaser.Game | null = null;

export function createGame(parent: HTMLElement): Phaser.Game {
  current = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    pixelArt: true,
    backgroundColor: "#1b1f3b",
    scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
    physics: { default: "arcade", arcade: { debug: false } },
    input: { activePointers: 2 },
    scene: [WorldScene],
  });
  return current;
}

export function destroyGame(game: Phaser.Game) {
  game.destroy(true);
  if (current === game) current = null;
}

export function currentGame(): Phaser.Game | null {
  return current;
}

const cache = new Map<string, string>();

/** PNG data URL of a procedurally generated texture, for use in React <img>. */
export function spriteUrl(key: string): string | undefined {
  if (cache.has(key)) return cache.get(key);
  if (!current?.textures.exists(key)) return undefined;
  const url = current.textures.getBase64(key);
  if (url) cache.set(key, url);
  return url;
}
