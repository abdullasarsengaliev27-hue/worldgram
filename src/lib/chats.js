import { supabase } from './supabase';

// Ищет ЛИЧНЫЙ чат (не группу) с пользователем. Возвращает chatId или null.
export async function findPrivateChatId(otherUserId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: mine } = await supabase
    .from('chat_members').select('chat_id').eq('user_id', user.id);
  const myIds = (mine || []).map(c => c.chat_id);
  if (myIds.length === 0) return null;

  const { data: privateChats } = await supabase
    .from('chats').select('id').in('id', myIds).eq('is_group', false);
  const privateIds = (privateChats || []).map(c => c.id);
  if (privateIds.length === 0) return null;

  const { data: shared } = await supabase
    .from('chat_members').select('chat_id')
    .eq('user_id', otherUserId)
    .in('chat_id', privateIds)
    .limit(1);

  return shared?.length > 0 ? shared[0].chat_id : null;
}

// Находит личный чат или создаёт новый. Бросает ошибку, если не получилось.
export async function getOrCreatePrivateChat(otherUserId) {
  const existing = await findPrivateChatId(otherUserId);
  if (existing) return existing;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Нужно войти в аккаунт');

  const { data: newChat, error } = await supabase
    .from('chats').insert({ is_group: false }).select().single();
  if (error) throw error;

  const { error: memErr } = await supabase.from('chat_members').insert([
    { chat_id: newChat.id, user_id: user.id },
    { chat_id: newChat.id, user_id: otherUserId },
  ]);
  if (memErr) throw memErr;

  return newChat.id;
}
