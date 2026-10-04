// End-to-end smoke test: create a character, walk to the guard, talk the gate open (offline mode),
// enter the forest, win a battle, and check XP + Bestiary. Screenshots go to e2e/screenshots/.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const PORT = 5199;
const APP_URL = `http://localhost:${PORT}/`;
const SHOTS = new URL("./screenshots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const vocab = ["environment", "technology", "education"].flatMap((t) =>
  JSON.parse(readFileSync(new URL(`../src/content/vocab.${t}.json`, import.meta.url))),
);
const blankOut = (text, word) => {
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  return text.slice(0, i) + "_____" + text.slice(i + word.length);
};

function correctOption(prompt, context, options) {
  const quoted = prompt.match(/"([^"]+)"/);
  if (quoted) return vocab.find((w) => w.word === quoted[1]).vi;
  // Several words can fit a blank ("_____ education"); the game guarantees exactly one is offered
  const fits = vocab
    .filter(
      (v) => blankOut(v.example, v.word) === context || blankOut(v.collocation, v.word) === context,
    )
    .map((v) => v.word);
  const answer = options.find((o) => fits.includes(o));
  if (!answer) throw new Error(`no fitting option for "${context}" in ${JSON.stringify(options)}`);
  return answer;
}

// Run Vite's own entry (not `npx`) so server.kill() stops the actual server
const server = spawn(
  process.execPath,
  // `--mode e2e` keeps .env.development out, so this test always runs offline
  ["node_modules/vite/bin/vite.js", "--port", String(PORT), "--strictPort", "--mode", "e2e"],
  {
    cwd: new URL("..", import.meta.url).pathname,
    stdio: "pipe",
  },
);
const fail = (msg) => {
  console.error("❌", msg);
  server.kill();
  process.exit(1);
};

try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => d.toString().includes("Local") && resolve());
    setTimeout(() => reject(new Error("dev server did not start")), 20000);
  });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // 1. Character creation
  await page.goto(APP_URL);
  await page.getByPlaceholder("Ví dụ: Bảo").fill("Tester");
  await page.getByRole("button", { name: /Ranger/ }).click();
  await page.screenshot({ path: SHOTS + "01-create.png" });
  await page.getByRole("button", { name: /Bắt đầu phiêu lưu/ }).click();
  await page.locator("canvas").first().waitFor();
  await page.waitForFunction(() => window.__lexoria);
  await page.waitForTimeout(800);
  // StrictMode mounts the game twice in dev — the first instance must be fully torn down
  if ((await page.locator("canvas").count()) !== 1) fail("leaked a Phaser canvas");
  await page.screenshot({ path: SHOTS + "02-town.png" });

  // 2. Walk to the guard with real keyboard input, steering by the player's tile position
  const playerPos = () =>
    page.evaluate(() => {
      const scene = window.__lexoria.game()?.scene.getScene("world");
      const p = scene?.player;
      return p ? { x: p.x, y: p.y, map: scene.mapId } : null;
    });
  const walkTo = async (tx, ty) => {
    const target = { x: tx * 16 + 8, y: ty * 16 + 8 };
    const startMap = (await playerPos())?.map;
    for (let i = 0; i < 150; i++) {
      const p = await playerPos();
      if (!p || p.map !== startMap) return; // walked through an exit
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      // Finish the vertical leg first, then the horizontal one
      const key =
        Math.abs(dy) > 3
          ? dy > 0
            ? "ArrowDown"
            : "ArrowUp"
          : Math.abs(dx) > 3
            ? dx > 0
              ? "ArrowRight"
              : "ArrowLeft"
            : null;
      if (!key) return;
      await page.keyboard.down(key);
      await page.waitForTimeout(
        Math.abs(dy) > 3 ? Math.min(150, Math.abs(dy) * 6) : Math.min(150, Math.abs(dx) * 6),
      );
      await page.keyboard.up(key);
    }
    await page.screenshot({ path: SHOTS + "stuck.png" });
    fail(`could not reach tile ${tx},${ty} (at ${JSON.stringify(await playerPos())})`);
  };
  await walkTo(14, 8);
  await walkTo(26, 8);
  await page.locator(".nearby", { hasText: "Sir Aldric" }).waitFor({ timeout: 3000 });
  await page.keyboard.press("e");
  await page.getByText("Nhiệm vụ:").waitFor();

  // 3. Convince the guard (offline heuristic)
  const say = async (text) => {
    await page.getByPlaceholder("Type in English…").fill(text);
    await page.getByRole("button", { name: "Gửi" }).click();
  };
  await say("Please let me pass because the elder asked me to defeat the word monsters.");
  await say("Also, I have studied hard, so I am ready to fight them.");
  await page.screenshot({ path: SHOTS + "03-dialogue.png" });
  await page.getByRole("button", { name: /Kết thúc/ }).click();
  await page.getByText("Hoàn thành nhiệm vụ!").waitFor();
  await page.screenshot({ path: SHOTS + "04-gate-open.png" });
  await page.getByRole("button", { name: "Đóng" }).click();

  // 4. Walk through the opened gate into the forest
  await walkTo(26, 9);
  await walkTo(29, 9);
  await page.waitForTimeout(1200);
  const map = await page.locator(".hud").innerText();
  if (!map.includes("Rừng Từ Vựng")) fail("did not reach the forest: " + map);
  await page.screenshot({ path: SHOTS + "05-forest.png" });

  // 5. Battle (opened directly through the dev hook) — answer everything correctly
  const xpBefore = await page.evaluate(() => window.__lexoria.useGame.getState().xp);
  await page.evaluate(() =>
    window.__lexoria.useUi
      .getState()
      .open({ type: "battle", enemyId: "m-12-10", topic: "education", isBoss: false }),
  );
  for (let i = 0; i < 12; i++) {
    if (await page.getByText("Chiến thắng!").isVisible()) break;
    await page.locator(".option").first().waitFor();
    const prompt = await page.locator(".question").innerText();
    const context = (await page.locator(".context").count())
      ? await page.locator(".context").innerText()
      : "";
    const options = (await page.locator(".option").allInnerTexts()).map((t) =>
      t.replace(/^\d\.\s*/, ""),
    );
    const answer = correctOption(prompt, context, options);
    if (i === 0) await page.screenshot({ path: SHOTS + "06-battle.png" });
    const exact = new RegExp(`^\\d\\.\\s*${answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
    await page.locator(".option", { hasText: exact }).click();
    await page.waitForTimeout(1500);
  }
  await page.getByText("Chiến thắng!").waitFor({ timeout: 3000 });
  await page.screenshot({ path: SHOTS + "07-victory.png" });
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  const after = await page.evaluate(() => {
    const s = window.__lexoria.useGame.getState();
    return {
      xp: s.xp,
      level: s.level,
      cards: Object.keys(s.cards).length,
      gate: s.flags.gateOpened,
    };
  });
  if (!(after.xp > xpBefore || after.level > 1)) fail("XP did not increase");
  if (after.cards < 2) fail("Bestiary did not record the words");
  if (!after.gate) fail("gate flag not saved");

  // 6. Bestiary
  await page.keyboard.press("b");
  await page.getByRole("button", { name: /Giáo dục/ }).click();
  await page.screenshot({ path: SHOTS + "08-bestiary.png" });
  await page.getByRole("button", { name: "Đóng" }).click();

  // 7. Save survives reload
  await page.reload();
  await page.locator("canvas").first().waitFor();
  const persisted = await page.evaluate(
    () => JSON.parse(localStorage.getItem("lexoria-save")).state.cards,
  );
  if (Object.keys(persisted).length !== after.cards) fail("save did not persist");

  // 8. Phone layout
  const phone = await (
    await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    })
  ).newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto(APP_URL);
  await phone.getByPlaceholder("Ví dụ: Bảo").waitFor();
  await phone.screenshot({ path: SHOTS + "09-phone-create.png" });
  await phone.getByPlaceholder("Ví dụ: Bảo").fill("Phone");
  await phone.getByRole("button", { name: /Bắt đầu phiêu lưu/ }).click();
  await phone.locator("canvas").first().waitFor();
  await phone.waitForTimeout(800);
  await phone.screenshot({ path: SHOTS + "10-phone-town.png" });
  await phone.evaluate(() =>
    window.__lexoria.useUi
      .getState()
      .open({ type: "battle", enemyId: "x", topic: "technology", isBoss: false }),
  );
  await phone.locator(".option").first().waitFor();
  await phone.screenshot({ path: SHOTS + "11-phone-battle.png" });

  if (errors.length) fail("page errors:\n" + errors.join("\n"));
  console.log("✅ e2e smoke passed", after);
  await browser.close();
} catch (e) {
  fail(e.stack ?? String(e));
}
server.kill();
