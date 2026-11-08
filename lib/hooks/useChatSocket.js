"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { ChatSocketEvents as E } from "@/lib/chat-socket-events";

function getSocketUrl() {
  if (typeof window === "undefined") return "";
  return process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
}

/**
 * Socket.io client cho chat P2P — presence, tin nhắn realtime, đã xem, đang nhập
 */
export function useChatSocket({
  userId,
  activeThreadId,
  onMessageNew,
  onMessageRead,
}) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(() => new Set());
  const [typingInThread, setTypingInThread] = useState(null);

  const onMessageNewRef = useRef(onMessageNew);
  const onMessageReadRef = useRef(onMessageRead);
  useEffect(()=>{onMessageNewRef.current=onMessageNew;onMessageReadRef.current=onMessageRead;},[onMessageNew,onMessageRead]);

  useEffect(() => {
    if (!userId) return;

    const socket = io(getSocketUrl(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
    socketRef.current = socket;
    let cancelled=false;
    fetch('/api/auth/session',{cache:'no-store'}).then(response=>response.json()).then(data=>{
      if(cancelled||!data.user)return;
      socket.connect();
    }).catch(()=>{});

    socket.on("connect", () => {
      setConnected(true);
      socket.emit(E.PRESENCE_REGISTER, userId);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on(E.PRESENCE_UPDATE, (ids) => {
      setOnlineUsers(new Set(Array.isArray(ids) ? ids : []));
    });

    socket.on(E.MESSAGE_NEW, (payload) => {
      onMessageNewRef.current?.(payload);
      window.dispatchEvent(new Event('reloo-notifications-change'));
    });

    socket.on(E.MESSAGE_READ, (payload) => {
      onMessageReadRef.current?.(payload);
    });

    socket.on(E.TYPING, (payload) => {
      if (!payload?.threadId || payload.userId === userId) return;
      if (payload.isTyping) {
        setTypingInThread(payload.threadId);
      } else {
        setTypingInThread((cur) => (cur === payload.threadId ? null : cur));
      }
    });

    return () => {
      cancelled=true;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected || !activeThreadId) return;

    socket.emit(E.THREAD_JOIN, activeThreadId);
    return () => {
      socket.emit(E.THREAD_LEAVE, activeThreadId);
    };
  }, [activeThreadId, connected]);

  const emitMessage = useCallback((payload) => {
    socketRef.current?.emit(E.MESSAGE_SEND, payload);
  }, []);

  const emitRead = useCallback((payload) => {
    socketRef.current?.emit(E.MESSAGE_READ, payload);
  }, []);

  const emitTyping = useCallback(
    (threadId, isTyping) => {
      if (!userId || !threadId) return;
      socketRef.current?.emit(E.TYPING, { threadId, userId, isTyping });
    },
    [userId]
  );

  const isUserOnline = useCallback(
    (id) => (id ? onlineUsers.has(id) : false),
    [onlineUsers]
  );

  return {
    connected,
    onlineUsers,
    isUserOnline,
    typingInThread,
    emitMessage,
    emitRead,
    emitTyping,
  };
}
