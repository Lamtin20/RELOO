import {runtimeBrain} from '../chat-control/runtime.js';
export async function botConfig(db, purpose) {
  const brain=await runtimeBrain(db);
  if(!brain.legacy)return {enabled:brain.config.enabled&&brain.config.modelEnabled,model:process.env.RELOO_AI_MODEL||'qwen2.5:1.5b',instructions:'',version:brain.id};
  const { data, error } = await db.from('crm_records').select('data').eq('module','bots').eq('status','APPROVED').order('updated_at',{ascending:false}).limit(20);
  if (error) throw new Error('Bot configuration unavailable');
  const config = data.find((item) => item.data.purpose === purpose)?.data || {};
  return { enabled: config.enabled !== 'false', model: config.model === 'qwen2.5:1.5b' ? config.model : process.env.RELOO_AI_MODEL || 'qwen2.5:1.5b', instructions: typeof config.instructions === 'string' ? config.instructions.slice(0,2000) : '' };
}
