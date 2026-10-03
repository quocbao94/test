import Phaser from "phaser";
import { TOPICS, type TopicId } from "../content";
import { NPCS, type NpcId } from "../content/npcs";
import { BOSS_UNLOCK_LEVEL } from "../lib/progression";
import { dueWordIds, useGame } from "../store/game";
import { useUi } from "../store/ui";
import { bus } from "./bus";
import { MAPS, parseMap, SOLID_TILES, T, TILE, type MapId } from "./maps";
import { createTextures, playerTextureKey } from "./textures";

const SPEED = 72;
const INTERACT_RANGE = 22;
const MONSTER_RESPAWN_MS = 30_000;

const NPC_BY_CHAR: Record<string, NpcId> = { "1": "elder", "2": "questmaster", "3": "guard" };

interface Interactable {
  sprite: Phaser.GameObjects.Sprite;
  label: string;
  action: () => void;
}

interface Monster {
  id: string;
  topic: TopicId;
  isBoss: boolean;
  sprite: Phaser.Physics.Arcade.Sprite;
  alert?: Phaser.GameObjects.Image;
  home: { x: number; y: number };
  cooldownUntil: number;
}

export interface NearbyInfo {
  label: string;
}

const tileCenter = (t: number) => t * TILE + TILE / 2;

export class WorldScene extends Phaser.Scene {
  private mapId: MapId = "town";
  private from?: MapId;
  private player!: Phaser.Physics.Arcade.Sprite;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private keys!: Record<
    "up" | "down" | "left" | "right" | "w" | "a" | "s" | "d" | "e" | "space",
    Phaser.Input.Keyboard.Key
  >;
  private interactables: Interactable[] = [];
  private monsters = new Map<string, Monster>();
  private gateTiles: { x: number; y: number }[] = [];
  private nearby: Interactable | null = null;
  private transitioning = false;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    super("world");
  }

  init(data: { mapId?: MapId; from?: MapId }) {
    this.mapId = data.mapId ?? "town";
    this.from = data.from;
    this.interactables = [];
    this.monsters.clear();
    this.gateTiles = [];
    this.nearby = null;
    this.transitioning = false;
  }

  create() {
    createTextures(this);
    const parsed = parseMap(MAPS[this.mapId]);
    const map = this.make.tilemap({ data: parsed.tiles, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage("tiles", "tiles", TILE, TILE, 0, 0)!;
    this.layer = map.createLayer(0, tileset, 0, 0)!;
    this.layer.setCollision(SOLID_TILES);
    const worldW = parsed.width * TILE;
    const worldH = parsed.height * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Player spawn: at P, or next to the exit we came through
    const spawnP = parsed.spawns.find((s) => s.ch === "P")!;
    let spawn = { x: spawnP.x, y: spawnP.y };
    if (this.from) {
      const exit = parsed.spawns.find((s) => s.ch === (this.mapId === "town" ? "E" : "T"))!;
      spawn = { x: exit.x + (this.mapId === "town" ? -2 : 1), y: exit.y };
    }
    const cls = useGame.getState().profile?.cls ?? "sage";
    this.player = this.physics.add.sprite(
      tileCenter(spawn.x),
      tileCenter(spawn.y),
      playerTextureKey(cls),
    );
    this.player.setDepth(10).setCollideWorldBounds(true);
    this.player.body!.setSize(10, 7).setOffset(3, 9);
    this.physics.add.collider(this.player, this.layer);

    const statics = this.physics.add.staticGroup();
    for (const s of parsed.spawns) {
      const x = tileCenter(s.x);
      const y = tileCenter(s.y);
      if (s.ch in NPC_BY_CHAR) {
        const npc = NPCS[NPC_BY_CHAR[s.ch]];
        const sprite = statics.create(x, y, `npc-${npc.id}`) as Phaser.Physics.Arcade.Sprite;
        sprite.setDepth(5).refreshBody();
        this.tweens.add({
          targets: sprite,
          y: y - 1,
          yoyo: true,
          repeat: -1,
          duration: 600 + s.x * 13,
        });
        this.interactables.push({
          sprite,
          label: `Nói chuyện với ${npc.name}`,
          action: () => useUi.getState().open({ type: "dialogue", npcId: npc.id }),
        });
      } else if (s.ch === "A") {
        const sprite = statics.create(x, y, "anvil") as Phaser.Physics.Arcade.Sprite;
        sprite.setDepth(5).refreshBody();
        this.interactables.push({
          sprite,
          label: "Vào Lò rèn Văn chương",
          action: () => useUi.getState().open({ type: "forge" }),
        });
      } else if (s.ch === "m") {
        const topic = TOPICS[this.monsters.size % TOPICS.length].id;
        this.spawnMonster(`m-${s.x}-${s.y}`, topic, false, x, y);
      } else if (s.ch === "X" && !useGame.getState().flags.bossDefeated) {
        this.spawnMonster("boss", "environment", true, x, y);
      }
    }
    this.physics.add.collider(this.player, statics);

    parsed.tiles.forEach((row, y) =>
      row.forEach((t, x) => {
        if (t === T.Gate) this.gateTiles.push({ x, y });
      }),
    );
    this.syncGate();

    // Camera
    this.cameras.main.setBounds(0, 0, worldW, worldH).startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setRoundPixels(true);
    this.applyZoom();
    this.scale.on("resize", this.applyZoom, this);
    this.cameras.main.fadeIn(250);

    // Input
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys(
      {
        up: K.UP,
        down: K.DOWN,
        left: K.LEFT,
        right: K.RIGHT,
        w: K.W,
        a: K.A,
        s: K.S,
        d: K.D,
        e: K.E,
        space: K.SPACE,
      },
      false,
    ) as typeof this.keys;
    this.keys.e.on("down", () => this.interact());
    this.keys.space.on("down", () => this.interact());

    // Store / UI bridges
    const onInteract = () => this.interact();
    const onDefeated = (id: string) => this.onMonsterDefeated(id);
    const onFled = (id: string) => this.onFled(id);
    const onPlayerDown = () => this.travel("town");
    bus.on("interact", onInteract);
    bus.on("enemy-defeated", onDefeated);
    bus.on("player-fled", onFled);
    bus.on("player-defeated", onPlayerDown);
    this.unsubscribers.push(
      () => bus.off("interact", onInteract),
      () => bus.off("enemy-defeated", onDefeated),
      () => bus.off("player-fled", onFled),
      () => bus.off("player-defeated", onPlayerDown),
      useGame.subscribe((s, prev) => {
        if (s.flags.gateOpened !== prev.flags.gateOpened) this.syncGate();
      }),
    );
    this.time.addEvent({ delay: 1500, loop: true, callback: () => this.refreshAlerts() });
    this.refreshAlerts();

    // SHUTDOWN fires on scene restart (map change), DESTROY when the whole game is torn down
    const cleanup = () => {
      if (!this.unsubscribers.length) return;
      this.unsubscribers.forEach((u) => u());
      this.unsubscribers = [];
      this.scale.off("resize", this.applyZoom, this);
      bus.emit("nearby", null);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    bus.emit("map", this.mapId);
  }

  private applyZoom() {
    const { width, height } = this.scale;
    const bounds = this.cameras.main.getBounds();
    // ~11 tiles across the short side, but never smaller than the map (no empty bands on tall phones).
    // Integer zoom keeps pixels crisp.
    const zoom = Math.max(
      2,
      Math.floor(Math.min(width, height) / (TILE * 11)),
      Math.ceil(width / bounds.width),
      Math.ceil(height / bounds.height),
    );
    this.cameras.main.setZoom(zoom);
  }

  private spawnMonster(id: string, topic: TopicId, isBoss: boolean, x: number, y: number) {
    const sprite = this.physics.add.sprite(x, y, isBoss ? "boss" : `mon-${topic}`);
    sprite.setDepth(6).setCollideWorldBounds(true);
    if (isBoss) {
      sprite.body!.setSize(24, 14).setOffset(4, 16);
      sprite.setImmovable(true);
    } else {
      sprite.body!.setSize(10, 8).setOffset(3, 7);
    }
    this.physics.add.collider(sprite, this.layer);
    const m: Monster = { id, topic, isBoss, sprite, home: { x, y }, cooldownUntil: 0 };
    this.monsters.set(id, m);
    this.physics.add.overlap(this.player, sprite, () => this.encounter(m));
    if (!isBoss) {
      this.time.addEvent({
        delay: Phaser.Math.Between(1200, 2600),
        loop: true,
        callback: () => this.wander(m),
      });
    }
    this.tweens.add({ targets: sprite, scaleY: 0.9, yoyo: true, repeat: -1, duration: 400 });
  }

  private wander(m: Monster) {
    if (!m.sprite.active || useUi.getState().overlay) return;
    const far = Phaser.Math.Distance.Between(m.sprite.x, m.sprite.y, m.home.x, m.home.y) > TILE * 3;
    if (far) {
      this.physics.moveTo(m.sprite, m.home.x, m.home.y, 25);
    } else if (Math.random() < 0.6) {
      const a = Math.random() * Math.PI * 2;
      m.sprite.setVelocity(Math.cos(a) * 22, Math.sin(a) * 22);
    } else {
      m.sprite.setVelocity(0);
    }
  }

  private refreshAlerts() {
    const due = dueWordIds(useGame.getState());
    const dueTopics = new Set(due.map((id) => id.split(":")[0]));
    for (const m of this.monsters.values()) {
      const show = !m.isBoss && dueTopics.has(m.topic);
      if (show && !m.alert) {
        m.alert = this.add.image(m.sprite.x, m.sprite.y - 12, "alert").setDepth(20);
      } else if (!show && m.alert) {
        m.alert.destroy();
        m.alert = undefined;
      }
    }
  }

  private encounter(m: Monster) {
    if (this.transitioning || useUi.getState().overlay || this.time.now < m.cooldownUntil) return;
    if (m.isBoss && useGame.getState().level < BOSS_UNLOCK_LEVEL) {
      m.cooldownUntil = this.time.now + 1500;
      this.pushPlayerAway(m.sprite);
      useUi
        .getState()
        .toast(`👑 Vua Câm Lặng quá mạnh! Cần đạt cấp ${BOSS_UNLOCK_LEVEL} để thách đấu.`);
      return;
    }
    this.player.setVelocity(0);
    m.sprite.setVelocity(0);
    this.cameras.main.flash(150, 255, 255, 255);
    useUi.getState().open({ type: "battle", enemyId: m.id, topic: m.topic, isBoss: m.isBoss });
  }

  private pushPlayerAway(from: Phaser.GameObjects.Sprite) {
    const a = Phaser.Math.Angle.Between(from.x, from.y, this.player.x, this.player.y);
    this.player.setPosition(this.player.x + Math.cos(a) * 12, this.player.y + Math.sin(a) * 12);
  }

  private onMonsterDefeated(id: string) {
    const m = this.monsters.get(id);
    if (!m) return;
    this.monsters.delete(id);
    m.alert?.destroy();
    this.tweens.add({
      targets: m.sprite,
      alpha: 0,
      scale: 1.6,
      duration: 300,
      onComplete: () => m.sprite.destroy(),
    });
    if (!m.isBoss) {
      this.time.delayedCall(MONSTER_RESPAWN_MS, () => {
        if (this.scene.isActive()) this.spawnMonster(id, m.topic, false, m.home.x, m.home.y);
      });
    }
  }

  private onFled(id: string) {
    const m = this.monsters.get(id);
    if (!m) return;
    m.cooldownUntil = this.time.now + 3000;
    this.pushPlayerAway(m.sprite);
  }

  private syncGate() {
    const open = useGame.getState().flags.gateOpened;
    for (const g of this.gateTiles) {
      this.layer.putTileAt(open ? T.Path : T.Gate, g.x, g.y);
    }
    this.layer.setCollision(SOLID_TILES);
    if (open) this.layer.setCollision([T.Gate], false);
  }

  private interact() {
    if (useUi.getState().overlay) return;
    this.nearby?.action();
  }

  private travel(to: MapId) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.restart({ mapId: to, from: this.mapId === to ? undefined : this.mapId }),
    );
  }

  update() {
    if (!this.player?.body || this.transitioning) return;
    if (useUi.getState().overlay) {
      this.player.setVelocity(0);
      for (const m of this.monsters.values()) m.sprite.setVelocity(0);
      return;
    }

    // Movement: keyboard, or hold pointer/finger on the map to walk toward it
    const k = this.keys;
    let vx = (k.left.isDown || k.a.isDown ? -1 : 0) + (k.right.isDown || k.d.isDown ? 1 : 0);
    let vy = (k.up.isDown || k.w.isDown ? -1 : 0) + (k.down.isDown || k.s.isDown ? 1 : 0);
    const pointer = this.input.activePointer;
    if (vx === 0 && vy === 0 && pointer.isDown && pointer.getDuration() > 120) {
      const wp = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const dx = wp.x - this.player.x;
      const dy = wp.y - this.player.y;
      if (Math.hypot(dx, dy) > 4) {
        vx = dx;
        vy = dy;
      }
    }
    const len = Math.hypot(vx, vy) || 1;
    this.player.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);
    if (vx !== 0) this.player.setFlipX(vx < 0);
    // Little walk bob
    this.player.setScale(1, vx || vy ? 1 + Math.sin(this.time.now / 60) * 0.06 : 1);

    for (const m of this.monsters.values()) m.alert?.setPosition(m.sprite.x, m.sprite.y - 12);

    // Nearby interactable
    let best: Interactable | null = null;
    let bestD = INTERACT_RANGE;
    for (const it of this.interactables) {
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        it.sprite.x,
        it.sprite.y,
      );
      if (d < bestD) {
        best = it;
        bestD = d;
      }
    }
    if (best !== this.nearby) {
      this.nearby = best;
      bus.emit("nearby", best ? ({ label: best.label } satisfies NearbyInfo) : null);
    }

    // Exits
    const tile = this.layer.getTileAtWorldXY(this.player.x, this.player.y);
    if (tile?.index === T.Exit) this.travel(this.mapId === "town" ? "forest" : "town");
  }
}
