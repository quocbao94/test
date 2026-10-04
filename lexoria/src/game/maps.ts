/**
 * Maps are drawn as text so they are easy to edit:
 *   #  tree (solid)      ~  water (solid)     =  path       .  grass   ,  grass (alt)
 *   F  flowers           R  roof (solid)      H  wall (solid)  D  door (solid)
 *   G  forest gate (solid until the guard lets you through)
 *   E  exit → forest     T  exit → town       P  player spawn
 *   1/2/3  NPCs (elder, questmaster, guard)   A  forge anvil
 *   m  word monster      X  boss
 */
export type MapId = "town" | "forest";

export const MAPS: Record<MapId, string[]> = {
  town: [
    "##############################",
    "#,...,........=.....,....,...#",
    "#..RRRRR......=.....RRRRR....#",
    "#..HHDHH......=.....HHDHH..,.#",
    "#....=...1....=.......=..2...#",
    "#....=========P========......#",
    "#.F......,....=.........F....#",
    "#....,........=....,.........#",
    "#..~~~~.......=............3.#",
    "#..~~~~...A...==============GE",
    "#..~~~~.......=..............#",
    "#.....,.......=.....,....F...#",
    "#.F.....,.....=..............#",
    "#.......F.....=....,.....,...#",
    "##############################",
  ],
  forest: [
    "########################################",
    "#,....,..##.....,.....##......,....##..#",
    "#..m.....##..........m##....m.......,..#",
    "#...,.......,...##..........,....##....#",
    "#.......m......###.......,......###.m..#",
    "#..##.....,.........m.........,........#",
    "#..##..,.......~~~~~....##.......m.....#",
    "#.........m....~~~~~....##.............#",
    "#.==========.......,..........======...#",
    "TP=========================.====....X..#",
    "#.....,.....m......====......,.........#",
    "#..##.........,.........m.....##...m...#",
    "#..##....m.......##...........##.......#",
    "#.......,........##....,..m........,...#",
    "#,...##.....m..........##..........##..#",
    "#....##....,.......,...##.....m....##..#",
    "########################################",
  ],
};

export const TILE = 16;

export enum T {
  Grass = 0,
  Grass2,
  Path,
  Tree,
  Water,
  Wall,
  Roof,
  Door,
  Gate,
  Flower,
  Exit,
}

export const SOLID_TILES = [T.Tree, T.Water, T.Wall, T.Roof, T.Door, T.Gate];

export const TILE_COUNT = 11;

export interface Spawn {
  ch: string;
  x: number;
  y: number;
}

export interface ParsedMap {
  width: number;
  height: number;
  tiles: number[][];
  spawns: Spawn[];
}

const CHAR_TILE: Record<string, T> = {
  ".": T.Grass,
  ",": T.Grass2,
  "=": T.Path,
  "#": T.Tree,
  "~": T.Water,
  H: T.Wall,
  R: T.Roof,
  D: T.Door,
  G: T.Gate,
  F: T.Flower,
  E: T.Exit,
  T: T.Exit,
  P: T.Path,
};

export function parseMap(rows: string[]): ParsedMap {
  const spawns: Spawn[] = [];
  const tiles = rows.map((row, y) =>
    [...row].map((ch, x) => {
      if (ch in CHAR_TILE) {
        if (ch === "P" || ch === "E" || ch === "T") spawns.push({ ch, x, y });
        return CHAR_TILE[ch];
      }
      spawns.push({ ch, x, y });
      return T.Grass;
    }),
  );
  return { width: rows[0].length, height: rows.length, tiles, spawns };
}
