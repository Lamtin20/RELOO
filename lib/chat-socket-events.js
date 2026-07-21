/** Socket.io event names — chat realtime */
export const ChatSocketEvents = {
  PRESENCE_REGISTER: 'presence:register',
  PRESENCE_UPDATE: 'presence:update',
  THREAD_JOIN: 'thread:join',
  THREAD_LEAVE: 'thread:leave',
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_READ: 'message:read',
  TYPING: 'typing',
};
