/**
 * Kiểm tra bảng tồn tại thật (không dùng HEAD — dễ báo false positive)
 */
export async function tableExists(client, table) {
  const { error } = await client.from(table).select('*').limit(1);
  if (!error) return true;
  if (error.code === 'PGRST205') return false;
  // Lỗi khác (RLS, permission…) — coi như bảng có
  return true;
}
