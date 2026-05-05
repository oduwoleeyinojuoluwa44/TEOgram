'use client';

import React, { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import * as crypto from '@/lib/crypto';
import type { Conversation, Message as ApiMessage, SearchUser } from '@/lib/api';
import { ApiError } from '@/lib/api';
import Icon from './Icon';

interface DecryptedMessage extends ApiMessage {
  plaintext?: string;
  isError?: boolean;
}

interface ChatUser {
  user_id: string;
  display_name: string;
  username: string;
}

const WS_URL = 'wss://whisperbox.koyeb.app/ws';
const MESSAGE_POLL_MS = 5000;
const CONVERSATION_POLL_MS = 12000;

function sortMessagesChronologically(items: DecryptedMessage[]) {
  return [...items].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
}

function mergeUniqueIds(current: string[], userId: string) {
  return current.includes(userId) ? current : [...current, userId];
}

function isEncryptedPayload(value: unknown): value is ApiMessage['payload'] {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return typeof payload.ciphertext === 'string'
    && typeof payload.iv === 'string'
    && typeof payload.encryptedKey === 'string';
}

function isApiMessage(value: unknown): value is ApiMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const message = value as Record<string, unknown>;
  return typeof message.id === 'string'
    && typeof message.from_user_id === 'string'
    && typeof message.to_user_id === 'string'
    && typeof message.created_at === 'string'
    && isEncryptedPayload(message.payload);
}

export default function ChatLayout() {
  const { user, privateKey, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, DecryptedMessage[]>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [sendError, setSendError] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedUserRef = useRef<ChatUser | null>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    privateKeyRef.current = privateKey;
    currentUserIdRef.current = user?.id ?? null;
  }, [privateKey, user?.id]);

  const replaceMessagesForConversation = (chatUserId: string, incoming: DecryptedMessage[]) => {
    startTransition(() => {
      setMessagesByConversation((current) => ({
        ...current,
        [chatUserId]: sortMessagesChronologically(incoming),
      }));
    });
  };

  const mergeMessagesForConversation = (chatUserId: string, incoming: DecryptedMessage[]) => {
    startTransition(() => {
      setMessagesByConversation((current) => {
        const existingMessages = current[chatUserId] ?? [];
        const map = new Map(existingMessages.map((message) => [message.id, message]));
        for (const message of incoming) {
          map.set(message.id, message);
        }
        return {
          ...current,
          [chatUserId]: sortMessagesChronologically([...map.values()]),
        };
      });
    });
  };

  const resetConversationMessages = () => {
    startTransition(() => {
      setMessagesByConversation({});
    });
  };

  const getConversationUserId = (message: Pick<ApiMessage, 'from_user_id' | 'to_user_id'>) => {
    const currentUserId = currentUserIdRef.current;
    if (!currentUserId) {
      return message.from_user_id;
    }

    return message.from_user_id === currentUserId ? message.to_user_id : message.from_user_id;
  };

  const currentMessages = useMemo(
    () => (selectedUser ? (messagesByConversation[selectedUser.user_id] ?? []) : []),
    [messagesByConversation, selectedUser]
  );

  const decryptHistoryMessage = useEffectEvent(async (message: ApiMessage) => {
    const activePrivateKey = privateKeyRef.current;
    const currentUserId = currentUserIdRef.current;

    if (!activePrivateKey) {
      return message;
    }

    try {
      const plaintext = await crypto.decryptMessage(
        message.payload,
        activePrivateKey,
        message.from_user_id === currentUserId
      );
      return { ...message, plaintext };
    } catch (error) {
      console.error('Decryption failed for message', message.id, error);
      return { ...message, plaintext: 'Decryption failed', isError: true };
    }
  });

  const refreshConversations = useEffectEvent(async () => {
    try {
      const data = await api.conversations.list();
      startTransition(() => setConversations(data));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return;
      }
      console.error('Failed to load conversations', error);
    }
  });

  const refreshMessages = useEffectEvent(async (chatUserId: string) => {
    try {
      const history = await api.conversations.getMessages(chatUserId);
      const decryptedMessages = await Promise.all(history.map(decryptHistoryMessage));
      replaceMessagesForConversation(chatUserId, decryptedMessages);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return;
      }
      console.error('Failed to load messages', error);
    }
  });

  const clearUnreadCount = (chatUserId: string) => {
    setUnreadCounts((current) => {
      if (!current[chatUserId]) {
        return current;
      }

      const next = { ...current };
      delete next[chatUserId];
      return next;
    });
  };

  const openConversation = (chatUser: ChatUser) => {
    setSelectedUser(chatUser);
    clearUnreadCount(chatUser.user_id);
  };

  // 1. Load Conversations
  useEffect(() => {
    void refreshConversations();

    const intervalId = window.setInterval(() => {
      void refreshConversations();
    }, CONVERSATION_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      resetConversationMessages();
    }
  }, [user?.id]);

  // 2. Load and Decrypt Messages
  useEffect(() => {
    if (!selectedUser || !privateKey) return;

    void refreshMessages(selectedUser.user_id);

    const intervalId = window.setInterval(() => {
      void refreshMessages(selectedUser.user_id);
    }, MESSAGE_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [selectedUser, privateKey, user?.id]);

  // 3. Realtime message delivery
  useEffect(() => {
    const accessToken = sessionStorage.getItem('access_token');
    if (!accessToken || !privateKey || !user?.id) {
      return;
    }

    const socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(accessToken)}`);

    socket.addEventListener('message', (event) => {
      const handleIncomingMessage = async () => {
        try {
          const frame = JSON.parse(event.data) as {
            event?: string;
            payload?: unknown;
            user_id?: string;
          };

          if (frame.event === 'user.online' && frame.user_id) {
            setOnlineUserIds((current) => mergeUniqueIds(current, frame.user_id as string));
            return;
          }

          if (frame.event === 'user.offline' && frame.user_id) {
            setOnlineUserIds((current) => current.filter((id) => id !== frame.user_id));
            return;
          }

          if (frame.event !== 'message.receive' || !isApiMessage(frame.payload)) {
            return;
          }

          const decryptedMessage = await decryptHistoryMessage(frame.payload);
          const conversationUserId = getConversationUserId(decryptedMessage);
          const activeChat = selectedUserRef.current;
          const isForVisibleConversation = activeChat?.user_id === conversationUserId;

          mergeMessagesForConversation(conversationUserId, [decryptedMessage]);

          if (isForVisibleConversation) {
            clearUnreadCount(conversationUserId);
          } else if (decryptedMessage.from_user_id !== currentUserIdRef.current) {
            setUnreadCounts((current) => ({
              ...current,
              [conversationUserId]: (current[conversationUserId] ?? 0) + 1,
            }));
          }

          await refreshConversations();
        } catch (error) {
          console.error('Failed to process realtime message', error);
        }
      };

      void handleIncomingMessage();
    });

    socket.addEventListener('error', () => {
      // Keep polling active as a fallback; browser error events are opaque and noisy.
    });

    return () => {
      socket.close();
    };
  }, [privateKey, user?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages]);

  // 4. Search Users
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await api.users.search(q);
      setSearchResults(results);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return;
      }
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  // 5. Send Message (The core E2EE logic)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !privateKey || !user) return;

    setIsSending(true);
    setSendError('');
    try {
      // A. Get Recipient Public Key
      const { public_key: recipientPubKeyBase64 } = await api.users.getPublicKey(selectedUser.user_id);
      const recipientPubKey = await crypto.importPublicKey(recipientPubKeyBase64);

      // B. Get My Public Key (stored in user profile)
      const myPubKey = await crypto.importPublicKey(user.public_key);

      // C. Encrypt
      const payload = await crypto.encryptMessage(
        newMessage,
        recipientPubKey,
        myPubKey
      );

      // D. Send to API
      const sentMsg = await api.messages.send(selectedUser.user_id, payload);

      // E. Update UI locally
      mergeMessagesForConversation(selectedUser.user_id, [{ ...sentMsg, plaintext: newMessage }]);
      setNewMessage('');

      // F. Refresh conversations list to update "last message"
      const updatedConversations = await api.conversations.list();
      startTransition(() => setConversations(updatedConversations));

    } catch (err) {
      console.error('Failed to send message', err);
      if (err instanceof ApiError && err.status === 401) {
        setSendError('Your session expired. Please sign in again.');
      } else {
        setSendError(err instanceof Error ? err.message : 'Encryption or delivery failed');
      }
    } finally {
      setIsSending(false);
    }
  };

  const selectConversation = (profile: SearchUser) => {
    openConversation({
      user_id: profile.id,
      display_name: profile.display_name,
      username: profile.username,
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const showMobileContactList = !selectedUser;

  return (
    <div className="flex h-screen overflow-hidden bg-[#1b1b1b] font-plus-jakarta text-[#f8fafc] antialiased">
      {/* SideNavBar */}
      <nav className={`${showMobileContactList ? 'flex' : 'hidden'} md:!flex animate-fade-in fixed left-0 top-0 z-10 h-screen w-full md:w-[320px] flex-col border-r border-[#343434] bg-[#262626] pt-5 pb-4 shadow-[18px_0_30px_rgba(0,0,0,0.24)]`}>
        <div className="mb-5 flex items-center justify-between px-5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">Messages</span>
            <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-white">Teogram</h1>
          </div>
          <button
            onClick={() => void logout()}
            className="neo-button flex h-10 w-10 items-center justify-center rounded-full border border-black/25 text-slate-300 transition duration-200 hover:scale-[1.03]"
            aria-label="Log out"
          >
            <Icon name="logout" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Search */}
          <div className="relative mb-4 px-4">
            <div className="neo-inset relative flex items-center rounded-[10px] border border-[#3d3d3d] transition">
              <Icon name={isSearching ? 'sync' : 'search'} className="absolute left-3 h-4 w-4 text-slate-500" />
              <input
                className="h-[42px] w-full rounded-[10px] border-none bg-transparent py-2 pl-9 pr-4 text-[14px] text-slate-100 placeholder:text-slate-500 focus:ring-0"
                placeholder="Search"
                type="text"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-4 right-4 top-full z-20 mt-2 max-h-60 overflow-y-auto rounded-[14px] border border-[#3a3a3a] bg-[#2a2a2a] shadow-[0_18px_36px_rgba(0,0,0,0.45)]">
                {searchResults.map((res) => (
                  <div
                    key={res.id}
                    onClick={() => selectConversation(res)}
                    className="flex cursor-pointer items-center gap-3 border-b border-[#363636] p-3 transition hover:bg-[#303030] last:border-0"
                  >
                    <div className="neo-button flex h-9 w-9 items-center justify-center rounded-full border border-black/20 text-xs font-semibold text-[#aebfff]">
                      {res.display_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-100">{res.display_name}</span>
                      <span className="text-xs text-slate-500">@{res.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conversations List */}
          <div className="mt-2 px-3">
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Recent Chats</div>
            <div className="flex flex-col gap-1">
              {conversations.map((conv) => (
                <div
                  key={conv.user_id}
                  onClick={() => openConversation(conv)}
                  className={`animate-slide-up-soft flex cursor-pointer items-center gap-3 rounded-[12px] border px-3 py-3 transition duration-200 ${
                    selectedUser?.user_id === conv.user_id
                      ? 'border-[#3b3b3b] bg-[#22252c] shadow-[inset_0_4px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]'
                      : 'border-transparent hover:border-[#333333] hover:bg-[#2d2d2d]'
                  }`}
                >
                  <div className="neo-button relative flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-black/20 font-semibold text-[15px] text-slate-100">
                    {conv.display_name.substring(0, 2).toUpperCase()}
                    {onlineUserIds.includes(conv.user_id) && (
                      <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-[#11141d] bg-[#34c759]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-0.5 flex items-baseline justify-between gap-3">
                      <span className="truncate text-[16px] font-semibold text-slate-100">{conv.display_name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {unreadCounts[conv.user_id] && (
                          <span className="min-w-[20px] rounded-full bg-[#0a84ff] px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                            {unreadCounts[conv.user_id] > 9 ? '9+' : unreadCounts[conv.user_id]}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-slate-500">
                          {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="block truncate text-[14px] text-slate-500">@{conv.username}</span>
                      {onlineUserIds.includes(conv.user_id) && (
                        <span className="text-[11px] font-medium text-[#34c759]">Online</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Chat Area */}
      <main className={`${showMobileContactList ? 'hidden' : 'flex'} md:!flex flex-1 flex-col md:ml-[320px] bg-[#1b1b1b]`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <header className="animate-fade-in flex h-[72px] w-full shrink-0 items-center justify-between border-b border-[#343434] bg-[#262626] px-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="neo-button md:hidden -ml-2 flex h-9 w-9 items-center justify-center rounded-full border border-black/25 text-[#93bcff] transition"
                  aria-label="Back to contacts"
                >
                  <Icon name="arrowBack" className="h-5 w-5" />
                </button>
                <div className="neo-button flex h-[42px] w-[42px] items-center justify-center rounded-full border border-black/20 font-semibold text-[15px] text-slate-100">
                  {selectedUser.display_name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-[19px] font-semibold text-white">{selectedUser.display_name}</h2>
                    <Icon name="lock" className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-[7px] w-[7px] rounded-full bg-[#34c759]"></span>
                    <span className="text-[12px] font-medium text-slate-500">End-to-end encrypted</span>
                  </div>
                </div>
              </div>
            </header>

            {/* Chat Canvas */}
            <div
              ref={scrollRef}
              className="flex flex-1 flex-col gap-5 overflow-y-auto bg-[#1b1b1b] px-4 py-5 md:px-8"
            >
              <div className="my-2 flex justify-center">
                <div className="animate-slide-up-soft inline-flex items-center gap-2 rounded-full border border-[#343434] bg-[#262626] px-3 py-1.5 text-[12px] font-medium text-slate-400 shadow-[0_10px_22px_rgba(0,0,0,0.28)]">
                  <Icon name="lock" className="h-4 w-4 text-[#93bcff]" />
                  <span>Messages stay encrypted between devices</span>
                </div>
              </div>

              {currentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`animate-slide-up-soft flex max-w-[78%] flex-col gap-1.5 ${
                    msg.from_user_id === user?.id ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <div
                    className={`px-4 py-2.5 text-[16px] leading-[1.35] transition duration-200 shadow-[0_14px_36px_rgba(0,0,0,0.24)] ${
                      msg.from_user_id === user?.id
                        ? 'rounded-[22px] rounded-br-[8px] border border-[#3f4b67] bg-[#2a3446] text-[#8fc3ff] shadow-[0_12px_22px_rgba(0,0,0,0.35)]'
                        : 'rounded-[22px] rounded-bl-[8px] border border-[#383838] bg-[#262626] text-slate-100 shadow-[0_12px_20px_rgba(0,0,0,0.28)]'
                    } ${msg.isError ? 'italic opacity-70' : ''}`}
                  >
                    {msg.plaintext}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 px-1">
                    <span className="text-[11px] font-medium text-slate-500">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.from_user_id === user?.id && (
                      <Icon name="checkAll" className="h-4 w-4 text-[#0a84ff]" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="shrink-0 border-t border-[#343434] bg-[#262626] px-4 py-4 md:px-6">
              <div className="mx-auto flex max-w-[60rem] items-end gap-3">
                <div className="flex-1 relative">
                  {sendError && (
                    <div className="animate-slide-up-soft mb-2 rounded-2xl border border-[#ff7b72]/25 bg-[#461a1a]/70 px-3 py-2 text-[12px] font-medium text-[#ffc3bd]">
                      {sendError}
                    </div>
                  )}
                  <textarea
                    className="neo-inset min-h-[48px] max-h-[120px] w-full resize-none overflow-hidden rounded-[12px] border border-[#3d3d3d] px-4 py-3 text-[14px] text-slate-100 placeholder:text-slate-500 transition duration-200 focus:outline-none disabled:opacity-50"
                    placeholder="Teogram"
                    rows={1}
                    style={{ height: '48px' }}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isSending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSending || !newMessage.trim()}
                  className="neo-button mb-1 flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-black/25 text-[#6ea7ff] transition duration-200 hover:scale-[1.04] hover:text-[#8ec0ff] disabled:opacity-50"
                >
                  {isSending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Icon name="send" className="h-5 w-5" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="animate-fade-in flex flex-1 flex-col items-center justify-center bg-[#1b1b1b] px-8 text-center text-slate-400">
            <div className="neo-button mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-black/25">
              <Icon name="chat" className="h-10 w-10 text-[#9db4ff]" />
            </div>
            <h3 className="mb-2 text-[24px] font-semibold text-white">Select a conversation</h3>
            <p className="max-w-[24rem] text-[14px] leading-6">Choose someone from the sidebar to start a calmer private thread with softer depth and end-to-end encryption.</p>
          </div>
        )}
      </main>
    </div>
  );
}
