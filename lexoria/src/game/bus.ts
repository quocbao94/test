import Phaser from "phaser";

/**
 * Bridge between Phaser scenes and React UI.
 * Phaser → React: "npc", "enemy", "travel"
 * React → Phaser: "enemy-defeated", "player-fled"
 */
export const bus = new Phaser.Events.EventEmitter();
