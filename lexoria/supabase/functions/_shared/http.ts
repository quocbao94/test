import { createClient } from "npm:@supabase/supabase-js@^2.117.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: { persistSession: false },
  },
);

const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") ?? "40");

/** Resolve the signed-in player and consume one AI call from today's quota. */
export async function authorize(req: Request): Promise<{ userId: string } | Response> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Hãy đăng nhập để dùng tính năng AI." }, 401);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: "Phiên đăng nhập không hợp lệ." }, 401);

  const { data: ok, error: quotaError } = await admin.rpc("consume_ai_quota", {
    p_user: data.user.id,
    p_limit: DAILY_LIMIT,
  });
  if (quotaError) return json({ error: "Không kiểm tra được hạn mức AI." }, 500);
  if (!ok)
    return json(
      { error: `Bạn đã dùng hết ${DAILY_LIMIT} lượt AI hôm nay. Quay lại vào ngày mai nhé!` },
      429,
    );

  return { userId: data.user.id };
}
