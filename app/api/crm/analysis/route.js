import { requirePermission } from "@/lib/operations/permissions";
import { assertOrigin, errorResponse } from "@/lib/server/http";
import { botConfig } from '@/lib/operations/bot-config';
import {recordAiEvent} from '@/lib/chat-control/runtime';
export async function POST(request) {
  try {
    assertOrigin(request);
    const { db,profile } = await requirePermission(request, "reports.read");const started=Date.now();
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: traces, error } = await db.from("api_traces").select("route,status,duration_ms").gte("created_at", since).order("created_at", { ascending: false }).limit(1000);
    if (error) throw new Error("Report unavailable");
    const facts = { sample: traces.length, errors: traces.filter((row) => row.status >= 500).length, denied: traces.filter((row) => [401, 403].includes(row.status)).length, averageLatencyMs: traces.length ? Math.round(traces.reduce((sum, row) => sum + row.duration_ms, 0) / traces.length) : 0, period: "7 ngày; tối đa 1.000 yêu cầu gần nhất" };
    let answer = `Trong mẫu ${facts.sample} yêu cầu: ${facts.errors} lỗi dịch vụ, ${facts.denied} yêu cầu thiếu quyền. Độ trễ trung bình ${facts.averageLatencyMs} ms.`, model = "RELOO_METRICS";
    const configuration = await botConfig(db, 'analysis');
    try {
      if (!configuration.enabled) throw new Error('Analysis AI disabled');
      const response = await fetch(process.env.RELOO_AI_URL + "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(45000), body: JSON.stringify({ model: process.env.RELOO_AI_MODEL || "qwen2.5:1.5b", stream: false, options: { temperature: 0.1, num_predict: 250 }, messages: [{ role: "system", content: "Phân tích vận hành RELOO bằng tiếng Việt, ngắn gọn. Chỉ dùng số liệu JSON đã cung cấp. Không suy đoán danh tính, gian lận, nghĩa vụ thuế hay doanh thu. Nêu giới hạn mẫu và đề xuất một bước kiểm tra lỗi API." }, { role: "user", content: JSON.stringify(facts) }] }) });
      const result = await response.json(); if (response.ok && result.message?.content) { answer = result.message.content.slice(0, 4000); model = process.env.RELOO_AI_MODEL || "qwen2.5:1.5b"; }
    } catch {}
    await recordAiEvent(db,{source:'analysis',kind:'summary',actor:profile.id,version:configuration.version||null,data:{model,decision:model==='RELOO_METRICS'?'FALLBACK_METRICS':'MODEL_SUMMARY',durationMs:Date.now()-started,count:facts.sample}});
    return Response.json({ ok: true, facts, answer, model });
  } catch (error) { return errorResponse(error); }
}
