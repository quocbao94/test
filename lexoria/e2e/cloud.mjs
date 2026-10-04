// End-to-end cloud test against the real Supabase project in .env.development:
// device 1 creates a character and logs in by magic link → the save is pushed;
// device 2 (empty browser) logs into the same account → the save is pulled down.
// Run with `SUPABASE_SERVICE_ROLE_KEY=... npm run e2e:cloud`. The test user is deleted afterwards.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { loadEnv } from "vite";

// Must be in the project's Auth → Redirect URLs, otherwise the magic link lands on the Site URL
const PORT = 5173;
const APP_URL = `http://localhost:${PORT}/`;
const SHOTS = new URL("./screenshots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const root = new URL("..", import.meta.url).pathname;
const env = loadEnv("development", root);
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!env.VITE_SUPABASE_URL || !serviceKey) {
  console.error("Need VITE_SUPABASE_URL in .env.development and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const admin = createClient(env.VITE_SUPABASE_URL, serviceKey, {
  auth: { persistSession: false },
});
const email = `lexoria-e2e-${Date.now().toString(36)}@example.com`;
let userId = null;

const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--port", String(PORT), "--strictPort"],
  { cwd: root, stdio: "pipe" },
);
let browser;
const cleanup = async () => {
  await browser?.close();
  server.kill();
  if (userId) await admin.auth.admin.deleteUser(userId);
};
const fail = async (msg) => {
  console.error("❌", msg);
  await cleanup();
  process.exit(1);
};

/** What the email would contain; opening it is the same as clicking the link in the inbox. */
async function magicLink() {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: APP_URL },
  });
  if (error) throw error;
  userId = data.user.id;
  return data.properties.action_link;
}

try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => d.toString().includes("Local") && resolve());
    setTimeout(() => reject(new Error("dev server did not start")), 20000);
  });

  // Reach Supabase through the HTTPS proxy if there is one. Chromium flags rather than Playwright's
  // `proxy` option, which also forces localhost (the dev server) through the proxy.
  const proxy = process.env.HTTPS_PROXY;
  browser = await chromium.launch({
    args: proxy ? [`--proxy-server=${proxy}`, "--proxy-bypass-list=localhost;127.0.0.1"] : [],
  });
  const errors = [];

  // Device 1: new character, then log in
  const pc = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  pc.on("pageerror", (e) => errors.push(e.message));
  await pc.goto(APP_URL);
  await pc.getByText("Đăng nhập để lưu tiến độ").waitFor();
  await pc.getByPlaceholder("Ví dụ: Bảo").fill("CloudHero");
  await pc.getByRole("button", { name: /Sage/ }).click();
  await pc.getByRole("button", { name: /Bắt đầu phiêu lưu/ }).click();
  await pc.waitForFunction(() => window.__lexoria);
  await pc.evaluate(() =>
    window.__lexoria.useGame.setState({ xp: 37, updatedAt: new Date().toISOString() }),
  );

  await pc.goto(await magicLink());
  await pc.waitForURL((u) => u.origin === new URL(APP_URL).origin);
  await pc.waitForFunction(() => window.__lexoria);
  await pc.evaluate(() => window.__lexoria.useUi.getState().open({ type: "character" }));
  await pc.getByText(`☁️ ${email}`).waitFor({ timeout: 15000 });
  await pc.getByText(/Đã đồng bộ lúc/).waitFor({ timeout: 15000 });
  await pc.screenshot({ path: SHOTS + "cloud-01-logged-in.png" });

  const { data: row, error } = await admin
    .from("profiles")
    .select("name, class")
    .eq("id", userId)
    .single();
  if (error) await fail("no profile row in Supabase: " + error.message);
  if (row.name !== "CloudHero" || row.class !== "sage")
    await fail("wrong profile row: " + JSON.stringify(row));
  const { data: stats } = await admin
    .from("player_stats")
    .select("xp")
    .eq("user_id", userId)
    .single();
  if (stats?.xp !== 37) await fail("wrong stats row: " + JSON.stringify(stats));

  // Device 2: empty browser, same account → the cloud save replaces the blank local one
  const phone = await (
    await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    })
  ).newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto(await magicLink());
  await phone.waitForURL((u) => u.origin === new URL(APP_URL).origin);
  await phone.getByText("Đã tải dữ liệu từ đám mây").waitFor({ timeout: 15000 });
  await phone.waitForFunction(
    () => window.__lexoria?.useGame.getState().profile?.name === "CloudHero",
  );
  const pulled = await phone.evaluate(() => {
    const s = window.__lexoria.useGame.getState();
    return { name: s.profile.name, cls: s.profile.cls, xp: s.xp };
  });
  if (pulled.cls !== "sage" || pulled.xp !== 37)
    await fail("pulled wrong save: " + JSON.stringify(pulled));
  await phone.screenshot({ path: SHOTS + "cloud-02-second-device.png" });

  // A signed-in player talks to an NPC: Claude's answer, or the offline lines while AI is off — never an error
  await phone.evaluate(() =>
    window.__lexoria.useUi.getState().open({ type: "dialogue", npcId: "guard" }),
  );
  const npcBubbles = phone.locator(".bubble.npc");
  const before = await npcBubbles.count();
  await phone.getByPlaceholder("Type in English…").fill("Hello, may I pass?");
  await phone.getByRole("button", { name: "Gửi" }).click();
  await phone.waitForFunction(
    (n) => {
      const b = document.querySelectorAll(".bubble.npc");
      return b.length > n && !b[b.length - 1].textContent.trim().startsWith("…");
    },
    before,
    { timeout: 30000 },
  );
  if (await phone.locator("[style*='--bad']").count()) await fail("NPC chat showed an error");
  await phone.screenshot({ path: SHOTS + "cloud-03-npc-chat.png" });
  await phone.evaluate(() => window.__lexoria.useUi.getState().close());

  // Logout clears the session
  await phone.evaluate(() => window.__lexoria.useUi.getState().open({ type: "character" }));
  await phone.getByRole("button", { name: "Đăng xuất" }).click();
  await phone.getByText("Đăng nhập để lưu tiến độ").waitFor();

  if (errors.length) await fail("page errors: " + errors.join("; "));
  console.log("✅ cloud e2e passed:", JSON.stringify({ email, pushed: row, pulled }));
  await cleanup();
} catch (e) {
  await fail(e.stack ?? String(e));
}
