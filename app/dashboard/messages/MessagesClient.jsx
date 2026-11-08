"use client";
import {HandoverPointPreview} from '@/components/location/HandoverPointPreview';

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessageCircle,
  ArrowLeft,
  ImageIcon,
  MapPin,
  Tag,
  Send,
  ShoppingBag,
  Plus,
  Camera,
  Smile,
  Mic,
  ShieldCheck,
  FileCheck2,
  X,
} from "lucide-react";
import { useAuth, useChat, useOrders, useReloo } from "@/lib/store";
import { EmptyState, Money } from "@/components/ui";
import { ChatLocationSheet } from "@/components/chat/ChatLocationSheet";
import { RentalAgreements } from "@/components/owner/RentalAgreements";
import { useChatSocket } from "@/lib/hooks/useChatSocket";
import { formatTimeAgo, generateId, getInquiryThreadId } from "@/lib/utils";
import {SupportConversationEntry} from '@/components/support/SupportConversationEntry';

const QUICK_REPLIES = [
  "Món này còn không ạ?",
  "Bạn có thể giao đồ không ạ?",
  "Cho mình xin địa chỉ nhận",
  "Khi nào có thể nhận đồ?",
];

const CHAT_EMOJIS = [
  "😀",
  "😂",
  "🥰",
  "😍",
  "😊",
  "😎",
  "🤔",
  "😅",
  "😢",
  "😡",
  "👍",
  "👎",
  "🙏",
  "👋",
  "❤️",
  "💚",
  "🔥",
  "✨",
  "💯",
  "🎉",
  "👏",
  "🤝",
  "📦",
  "✅",
  "❌",
  "⏰",
  "📍",
  "📷",
  "🎤",
  "💬",
  "🛒",
  "⭐",
];

function formatRecordTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function messagePreview(msg) {
  if (!msg) return "";
  if (msg.type === "system") return msg.text ?? "";
  if (msg.type === "image") return "📷 Đã gửi hình ảnh";
  if (msg.type === "video") return "🎬 Đã gửi video";
  if (msg.type === "audio") return "🎤 Tin nhắn thoại";
  if (msg.type === "location") {
    return `📍 ${msg.location?.address || msg.location?.label || "Vị trí"}`;
  }
  return msg.text ?? "";
}

function MessageBubble({ msg, mine, avatar, counterpartyId }) {
  if (msg.type === "system") {
    return (
      <div className="zalo-msg zalo-msg--system">
        <span>{msg.text}</span>
      </div>
    );
  }

  const bubbleClass = `zalo-msg ${mine ? "zalo-msg--mine" : "zalo-msg--theirs"}`;

  let content = null;
  if (msg.type === "image" && msg.mediaUrl) {
    content = <img src={msg.mediaUrl} alt="" className="zalo-msg__media" />;
  } else if (msg.type === "video" && msg.mediaUrl) {
    content = <video controls src={msg.mediaUrl} className="zalo-msg__media" />;
  } else if (msg.type === "audio" && msg.mediaUrl) {
    content = (
      <div className="zalo-msg__audio">
        <Mic size={16} />
        <audio controls src={msg.mediaUrl} preload="metadata" />
        {msg.duration != null && (
          <span className="zalo-msg__audio-dur">
            {formatRecordTime(msg.duration)}
          </span>
        )}
      </div>
    );
  } else if (msg.type === "location" && msg.location) {
    const { lat, lng, address, label } = msg.location;
    content = (
      <a
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="zalo-msg__location"
      >
        <MapPin size={16} />
        <div>
          <strong>{label || "Địa chỉ"}</strong>
          <p>{address}</p>
        </div>
      </a>
    );
  } else {
    content = <p>{msg.text}</p>;
  }

  const seen =
    mine &&
    counterpartyId &&
    Array.isArray(msg.readBy) &&
    msg.readBy.includes(counterpartyId);

  return (
    <div
      className={`zalo-msg-row ${mine ? "zalo-msg-row--mine" : "zalo-msg-row--theirs"}`}
    >
      {!mine && avatar && (
        <img src={avatar} alt="" className="zalo-msg-row__avatar" />
      )}
      <div className={bubbleClass}>
        {content}
        {msg.handoverLocation&&<HandoverPointPreview location={msg.handoverLocation}/>}
        <div className="zalo-msg__meta">
          <time>{formatTimeAgo(msg.createdAt)}</time>
          {mine && msg.type !== "system" && (
            <span className={`zalo-msg__status ${seen ? "is-seen" : ""}`}>
              {seen ? "Đã xem" : "Đã gửi"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { orders } = useOrders({ userId: user?.id });
  const { state, actions } = useReloo();
  const {
    getUserThreads,
    getThreadListing,
    getThreadCounterparty,
    ensureOrderThread,
    sendChatMessage,
    receiveChatMessage,
    markMessagesReadBy,
  } = useChat();
  const searchParams = useSearchParams();
  const guestLocation = state.guestLocation;

  const [activeThreadId, setActiveThreadId] = useState(null);
  const [draft, setDraft] = useState("");
  const [threadQuery, setThreadQuery] = useState("");
  const [threadFilter, setThreadFilter] = useState("ALL");
  const [chatError, setChatError] = useState("");
  const [mobileList, setMobileList] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const bodyRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const recordStreamRef = useRef(null);
  const recordingTimeRef = useRef(0);
  const recordingCancelledRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!user) return;
    orders
      .filter((o) => o.status !== "cancelled")
      .forEach((o) => ensureOrderThread(o.id));
  }, [orders, user, ensureOrderThread]);

  useEffect(() => {
    const threadParam = searchParams.get("thread");
    const listingParam = searchParams.get("listing");
    if (listingParam && user) {
      actions
        .ensureInquiryThread(listingParam, user.id)
        .catch((error) => setChatError(error.message));
    }
    const selected =
      threadParam ||
      (listingParam && user ? getInquiryThreadId(listingParam, user.id) : null);
    if (!selected) return;
    const timer = setTimeout(() => {
      setActiveThreadId(selected);
      setMobileList(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, user, actions]);

  const threads = useMemo(() => {
    if (!user) return [];
    return getUserThreads(user.id).map((thread) => {
      const listing = getThreadListing(thread);
      const counterparty = getThreadCounterparty(thread, user.id);
      const messages = thread.messages ?? [];
      const last = messages[messages.length - 1];
      const unreadCount = messages.filter(
        (m) =>
          m.senderId !== user.id &&
          m.type !== "system" &&
          !m.readBy?.includes(user.id),
      ).length;
      return {
        thread,
        listing,
        counterparty,
        messages,
        lastMessage: messagePreview(last) || "Bắt đầu trao đổi",
        lastAt: last?.createdAt ?? thread.updatedAt,
        unread: unreadCount > 0,
        unreadCount,
      };
    });
  }, [
    user,
    getUserThreads,
    getThreadListing,
    getThreadCounterparty,
    state.chatThreads,
  ]);

  const effectiveThreadId =
    activeThreadId ?? (isDesktop ? threads[0]?.thread.id : null);

  const {
    connected,
    isUserOnline,
    typingInThread,
    emitMessage,
    emitRead,
    emitTyping,
  } = useChatSocket({
    userId: user?.id,
    activeThreadId: effectiveThreadId,
    onMessageNew: (payload) => {
      if (!payload?.threadId || !payload?.message) return;
      if (payload.message.senderId === user?.id) return;
      receiveChatMessage(payload.threadId, payload.message);
    },
    onMessageRead: (payload) => {
      if (!payload?.threadId || !payload?.readerId) return;
      markMessagesReadBy(payload.threadId, payload.readerId, payload.readAt);
    },
  });

  const displayThread = useMemo(() => {
    if (!effectiveThreadId) return null;
    return threads.find((t) => t.thread.id === effectiveThreadId) ?? null;
  }, [effectiveThreadId, threads]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [displayThread?.messages.length, activeThreadId]);

  useEffect(() => {
    if (!effectiveThreadId || !user?.id) return;
    const readAt = new Date().toISOString();
    markMessagesReadBy(effectiveThreadId, user.id, readAt);
    emitRead({ threadId: effectiveThreadId, readerId: user.id, readAt });
  }, [
    effectiveThreadId,
    user?.id,
    displayThread?.messages.length,
    markMessagesReadBy,
    emitRead,
  ]);

  useEffect(() => {
    if (!effectiveThreadId) return;
    if (!draft.trim()) {
      emitTyping(effectiveThreadId, false);
      return;
    }
    emitTyping(effectiveThreadId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(effectiveThreadId, false);
    }, 2000);
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [draft, effectiveThreadId, emitTyping]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      recordStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function cleanupRecording() {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    recordStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordStreamRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
    recordingTimeRef.current = 0;
  }

  function insertEmoji(emoji) {
    setDraft((prev) => prev + emoji);
  }

  function toggleEmojiPanel() {
    setEmojiOpen((v) => !v);
    setToolsOpen(false);
  }

  async function startRecording() {
    if (isRecording || !displayThread) return;
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      window.alert("Trình duyệt không hỗ trợ ghi âm.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (recordingCancelledRef.current) {
          cleanupRecording();
          return;
        }
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size > 0) {
          pushMessage({
            type: "audio",
            mediaUrl: URL.createObjectURL(blob),
            duration: recordingTimeRef.current,
          });
        }
        cleanupRecording();
      };

      recordingCancelledRef.current = false;
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setEmojiOpen(false);
      setToolsOpen(false);
      recordingTimeRef.current = 0;
      setRecordingTime(0);
      recordTimerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    } catch {
      window.alert(
        "Không thể ghi âm. Vui lòng cho phép quyền truy cập microphone.",
      );
      cleanupRecording();
    }
  }

  function stopRecordingAndSend() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      return;
    }
    cleanupRecording();
  }

  function cancelRecording() {
    recordingCancelledRef.current = true;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      return;
    }
    cleanupRecording();
  }

  function handleMicClick() {
    if (isRecording) {
      stopRecordingAndSend();
    } else {
      startRecording();
    }
  }

  async function pushMessage(message) {
    if (!displayThread || !user) return;
    const msg = {
      id: generateId("msg"),
      createdAt: new Date().toISOString(),
      readBy: [],
      ...message,
      senderId: message.senderId ?? user.id,
    };
    try {
      const saved = await sendChatMessage(displayThread.thread.id, msg);
      emitMessage({ threadId: displayThread.thread.id, message: saved });
      setChatError("");
    } catch (error) {
      setChatError(error.message);
    }
  }

  async function sendText(text) {
    if (!text.trim()) return;
    await pushMessage({ type: "text", text: text.trim() });
    setDraft("");
  }

  function handleSend(e) {
    e.preventDefault();
    sendText(draft);
  }

  function handleMediaPick(file) {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    pushMessage({
      type: isVideo ? "video" : "image",
      mediaUrl: URL.createObjectURL(file),
    });
    setToolsOpen(false);
  }

  function handleShareLocation(location) {
    pushMessage({
      type: "location",
      location: {
        lat: location.lat,
        lng: location.lng,
        label: location.label || "Vị trí hiện tại",
        address: location.address,
      },
    });
    setLocationOpen(false);
    setToolsOpen(false);
  }

  function openThread(threadId) {
    setActiveThreadId(threadId);
    setMobileList(false);
  }

  function backToList() {
    setActiveThreadId(null);
    setMobileList(true);
    setToolsOpen(false);
  }

  function handleHeaderBack() {
    if (!isDesktop && !mobileList) {
      backToList();
      return;
    }
    router.back();
  }

  if (!user) return null;

  const chatOpen = Boolean(displayThread && (!mobileList || isDesktop));
  const showChatPanel = Boolean(displayThread && (isDesktop || !mobileList));
  const listingUnavailable =
    displayThread?.listing && displayThread.listing.status !== "available";

  if (threads.length === 0) {
    return (
      <div className="messages-shell">
        <div className="messages-page messages-page--empty">
          <header className="zalo-list-header">
            <h1>Tin nhắn</h1>
          </header>
          <SupportConversationEntry />
          <EmptyState
            icon="MessageCircle"
            title="Chưa có cuộc trao đổi"
            description="Bấm Chat trên trang sản phẩm để hỏi chủ đồ, hoặc trao đổi sau khi có đơn thuê."
            action={
              <Link href="/explore" className="btn btn-primary">
                Khám phá sản phẩm
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`messages-shell ${chatOpen ? "messages-shell--chat-open" : ""}`}
    >
      <div className="messages-page">
        <aside className={`zalo-list ${chatOpen ? "zalo-list--hidden" : ""}`}>
          <SupportConversationEntry />
          <header className="zalo-list-header zalo-list-header--with-back">
            <button
              type="button"
              className="zalo-chat__back zalo-chat__back--always"
              onClick={() => router.back()}
              aria-label="Quay lại"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1>Tin nhắn</h1>
              <p>
                {threads.length} cuộc hội thoại
                {connected ? (
                  <span className="zalo-socket-status zalo-socket-status--on">
                    {" "}
                    · Đã kết nối
                  </span>
                ) : (
                  <span className="zalo-socket-status"> · Đang kết nối...</span>
                )}
              </p>
            </div>
          </header>
          <div className="commerce-chat-filters">
            <input
              aria-label="Tìm cuộc trò chuyện"
              placeholder="Tìm cuộc trò chuyện"
              value={threadQuery}
              onChange={(e) => setThreadQuery(e.target.value)}
            />
            <div>
              <button
                type="button"
                aria-pressed={threadFilter === "ALL"}
                onClick={() => setThreadFilter("ALL")}
              >
                Tất cả
              </button>
              <button
                type="button"
                aria-pressed={threadFilter === "UNREAD"}
                onClick={() => setThreadFilter("UNREAD")}
              >
                Chưa đọc
              </button>
            </div>
          </div>
          <div className="zalo-list__items">
            {threads
              .filter(
                (item) =>
                  (threadFilter !== "UNREAD" || item.unreadCount > 0) &&
                  (
                    (item.counterparty?.name || "") +
                    " " +
                    (item.listing?.title || "")
                  )
                    .toLocaleLowerCase("vi")
                    .includes(threadQuery.trim().toLocaleLowerCase("vi")),
              )
              .map((item) => (
                <button
                  key={item.thread.id}
                  type="button"
                  className={`zalo-list-item ${
                    displayThread?.thread.id === item.thread.id
                      ? "is-active"
                      : ""
                  } ${item.unread ? "is-unread" : ""}`.trim()}
                  onClick={() => openThread(item.thread.id)}
                >
                  <div className="zalo-list-item__avatar-wrap">
                    <img
                      src={item.counterparty?.avatar}
                      alt=""
                      className="zalo-list-item__avatar"
                    />
                    {isUserOnline(item.counterparty?.id) && (
                      <span
                        className="zalo-presence-dot"
                        title="Đang trực tuyến"
                      />
                    )}
                  </div>
                  <div className="zalo-list-item__body">
                    <div className="zalo-list-item__top">
                      <strong>{item.counterparty?.name ?? "Người dùng"}</strong>
                      <span>{formatTimeAgo(item.lastAt)}</span>
                    </div>
                    <div className="zalo-list-item__product">
                      {item.thread.type === "inquiry" ? (
                        <ShoppingBag size={12} />
                      ) : (
                        <Tag size={12} />
                      )}
                      {item.listing?.title ?? "Sản phẩm"}
                    </div>
                    <p className="zalo-list-item__preview">
                      {item.lastMessage}
                    </p>
                  </div>
                  {item.unreadCount > 0 && (
                    <span className="zalo-list-item__badge">
                      {item.unreadCount}
                    </span>
                  )}
                </button>
              ))}
          </div>
        </aside>

        <section
          className={`zalo-chat ${showChatPanel ? "zalo-chat--visible" : ""}`}
        >
          {!displayThread ? (
            <div className="zalo-chat__placeholder">
              <MessageCircle size={48} strokeWidth={1.25} />
              <p>Chọn cuộc trao đổi để bắt đầu nhắn tin</p>
            </div>
          ) : (
            <>
              <header className="zalo-chat__header">
                <button
                  type="button"
                  className="zalo-chat__back zalo-chat__back--always"
                  onClick={handleHeaderBack}
                  aria-label="Quay lại"
                >
                  <ArrowLeft size={22} />
                </button>
                <img
                  src={displayThread.counterparty?.avatar}
                  alt=""
                  className="zalo-chat__header-avatar"
                />
                <div className="zalo-chat__header-info">
                  <strong>
                    {displayThread.counterparty?.name}
                    {isUserOnline(displayThread.counterparty?.id) && (
                      <span className="zalo-presence-dot zalo-presence-dot--inline" />
                    )}
                  </strong>
                  <span>
                    {typingInThread === displayThread.thread.id
                      ? "Đang nhập..."
                      : isUserOnline(displayThread.counterparty?.id)
                        ? "Đang trực tuyến"
                        : `Hoạt động ${formatTimeAgo(
                            displayThread.counterparty?.lastActive ??
                              displayThread.lastAt,
                          )}`}
                  </span>
                </div>
                {displayThread.thread.orderId && (
                  <Link
                    href={`/dashboard/orders/${displayThread.thread.orderId}`}
                    className="zalo-chat__header-link"
                  >
                    Xem đơn
                  </Link>
                )}
              </header>

              {displayThread.listing && (
                <div className="zalo-product-card">
                  <div
                    className="zalo-product-card__thumb"
                    style={{
                      backgroundImage: displayThread.listing.images?.[0]
                        ? `url(${displayThread.listing.images[0]})`
                        : undefined,
                    }}
                  />
                  <div className="zalo-product-card__info">
                    <p>{displayThread.listing.title}</p>
                    <Money
                      amount={
                        displayThread.listing.transactionMode === "SALE"
                          ? displayThread.listing.salePrice
                          : displayThread.listing.dailyPrice
                      }
                      suffix={
                        displayThread.listing.transactionMode === "SALE"
                          ? "giá bán"
                          : "/ngày"
                      }
                    />
                    {listingUnavailable && (
                      <span className="zalo-product-card__note">
                        Tin không còn hiển thị
                      </span>
                    )}
                  </div>
                  <Link
                    className="chat-product-rent"
                    href={
                      displayThread.listing.transactionMode === "SALE"
                        ? `/purchase/${displayThread.listing.id}`
                        : `/rent/${displayThread.listing.id}`
                    }
                  >
                    <ShoppingBag size={17} />{" "}
                    {displayThread.listing.transactionMode === "SALE"
                      ? "Mua ngay"
                      : "Chọn ngày thuê"}
                  </Link>
                </div>
              )}

              <details className="chat-safety-note">
                <summary>
                  <ShieldCheck size={16} />
                  Trao đổi trên RELOO để lưu bằng chứng giao dịch
                </summary>
                <p>
                  Xác nhận giá, thời gian thuê, tình trạng món đồ và giao nhận
                  trong cuộc trò chuyện. Lịch sử này giúp hai bên và bộ phận hỗ
                  trợ đối chiếu khi phát sinh tranh chấp. Không chia sẻ mật
                  khẩu, mã OTP hoặc ảnh căn cước trong chat.{" "}
                  <Link href="/cms/help">Quy trình khiếu nại</Link>
                </p>
              </details>
              <details className="chat-agreement-tool">
                <summary>
                  <FileCheck2 size={16} />
                  Thỏa thuận & lịch sử thuê
                </summary>
                <RentalAgreements
                  key={displayThread.thread.id}
                  threadId={displayThread.thread.id}
                  compact
                />
              </details>
              <div className="zalo-chat__body" ref={bodyRef}>
                {displayThread.messages.length === 0 ? (
                  <div className="zalo-chat__empty">
                    <p>
                      Gửi tin nhắn đầu tiên cho{" "}
                      {displayThread.counterparty?.name}
                    </p>
                  </div>
                ) : (
                  displayThread.messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      mine={msg.senderId === user.id}
                      avatar={displayThread.counterparty?.avatar}
                      counterpartyId={displayThread.counterparty?.id}
                    />
                  ))
                )}
              </div>

              <div className="zalo-chat__quick">
                {(displayThread.listing?.transactionMode === "SALE"
                  ? [
                      "Món này còn không ạ?",
                      "Tình trạng thực tế thế nào ạ?",
                      "Mình muốn trao đổi giá món này.",
                    ]
                  : QUICK_REPLIES
                ).map((text) => (
                  <button
                    key={text}
                    type="button"
                    className="zalo-chat__chip"
                    onClick={() => setDraft(text)}
                  >
                    {text}
                  </button>
                ))}
              </div>

              {chatError && (
                <p
                  className="feature-error"
                  role="alert"
                  style={{ paddingInline: 16 }}
                >
                  {chatError}
                </p>
              )}
              <form className="zalo-compose" onSubmit={handleSend}>
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  hidden
                  onChange={(e) => {
                    handleMediaPick(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => {
                    handleMediaPick(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />

                {emojiOpen && (
                  <div className="zalo-emoji-picker">
                    <div className="zalo-emoji-picker__grid">
                      {CHAT_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="zalo-emoji-picker__btn"
                          onClick={() => insertEmoji(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isRecording ? (
                  <div className="zalo-recording">
                    <button
                      type="button"
                      className="zalo-recording__cancel"
                      onClick={cancelRecording}
                      aria-label="Huỷ ghi âm"
                    >
                      <X size={18} />
                      <span>Huỷ</span>
                    </button>
                    <div className="zalo-recording__pulse">
                      <Mic size={20} />
                      <span>Đang ghi... {formatRecordTime(recordingTime)}</span>
                    </div>
                    <button
                      type="button"
                      className="zalo-recording__send"
                      onClick={stopRecordingAndSend}
                      aria-label="Gửi tin nhắn thoại"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="zalo-inputbar">
                    <button
                      type="button"
                      className={`zalo-inputbar__tool ${toolsOpen ? "is-active" : ""}`}
                      onClick={() => {
                        setToolsOpen((v) => !v);
                        setEmojiOpen(false);
                      }}
                      aria-label="Thêm"
                    >
                      <Plus size={22} />
                    </button>
                    <button
                      type="button"
                      className="zalo-inputbar__tool"
                      onClick={() => cameraInputRef.current?.click()}
                      aria-label="Chụp ảnh"
                    >
                      <Camera size={20} />
                    </button>
                    <button
                      type="button"
                      className="zalo-inputbar__tool"
                      onClick={() => mediaInputRef.current?.click()}
                      aria-label="Hình và video"
                    >
                      <ImageIcon size={20} />
                    </button>
                    <div className="zalo-inputbar__field">
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Nhắn cho chủ đồ…"
                        aria-label="Nội dung tin nhắn"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendText(draft);
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className={`zalo-inputbar__tool ${emojiOpen ? "is-active" : ""}`}
                      onClick={toggleEmojiPanel}
                      aria-label="Biểu cảm"
                    >
                      <Smile size={20} />
                    </button>
                    {draft.trim() ? (
                      <button
                        type="submit"
                        className="zalo-inputbar__send"
                        aria-label="Gửi"
                      >
                        <Send size={18} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="zalo-inputbar__tool zalo-inputbar__tool--mic"
                        onClick={handleMicClick}
                        aria-label="Ghi âm tin nhắn"
                      >
                        <Mic size={20} />
                      </button>
                    )}
                  </div>
                )}

                {toolsOpen && !isRecording && (
                  <div className="zalo-toolkit">
                    <button
                      type="button"
                      className="zalo-toolkit__item"
                      onClick={() => mediaInputRef.current?.click()}
                    >
                      <span className="zalo-toolkit__icon zalo-toolkit__icon--media">
                        <ImageIcon size={22} />
                      </span>
                      <span>Hình và video</span>
                    </button>
                    <button
                      type="button"
                      className="zalo-toolkit__item"
                      onClick={() => setLocationOpen(true)}
                    >
                      <span className="zalo-toolkit__icon zalo-toolkit__icon--loc">
                        <MapPin size={22} />
                      </span>
                      <span>Địa chỉ</span>
                    </button>
                  </div>
                )}
              </form>

              <ChatLocationSheet
                open={locationOpen}
                onClose={() => setLocationOpen(false)}
                onShare={handleShareLocation}
                initialAddress={
                  guestLocation?.ward?.name && guestLocation?.province?.name
                    ? `${guestLocation.ward.name}, ${guestLocation.province.name}`
                    : user?.address || ""
                }
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
