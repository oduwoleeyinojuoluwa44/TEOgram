'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import * as crypto from '@/lib/crypto';
import type { Conversation, Message as ApiMessage, SearchUser } from '@/lib/api';
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

export default function ChatLayout() {
  const { user, privateKey, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendError, setSendError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void api.conversations.list().then(setConversations).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedUser || !privateKey || !user) {
      return;
    }

    const loadMessages = async () => {
      try {
        const history = await api.conversations.getMessages(selectedUser.user_id);
        const decrypted = await Promise.all(
          history.map(async (message) => {
            try {
              const plaintext = await crypto.decryptMessage(
                message.payload,
                privateKey,
                message.from_user_id === user.id
              );
              return { ...message, plaintext };
            } catch {
              return { ...message, plaintext: 'Decryption failed', isError: true };
            }
          })
        );
        setMessages(
          decrypted.sort((left, right) => (
            new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
          ))
        );
      } catch {
        setMessages([]);
      }
    };

    void loadMessages();
  }, [selectedUser, privateKey, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSearch = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchResults(await api.users.search(value));
    } catch {
      setSearchResults([]);
    }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMessage.trim() || !selectedUser || !privateKey || !user) {
      return;
    }

    setSendError('');

    try {
      const { public_key: recipientPublicKey } = await api.users.getPublicKey(selectedUser.user_id);
      const recipientKey = await crypto.importPublicKey(recipientPublicKey);
      const myPublicKey = await crypto.importPublicKey(user.public_key);
      const payload = await crypto.encryptMessage(newMessage, recipientKey, myPublicKey);
      const sent = await api.messages.send(selectedUser.user_id, payload);

      setMessages((current) => [
        ...current,
        { ...sent, plaintext: newMessage },
      ]);
      setNewMessage('');
      setConversations(await api.conversations.list());
    } catch (value: unknown) {
      setSendError(value instanceof Error ? value.message : 'Unable to send message');
    }
  };

  const selectConversation = (profile: SearchUser | Conversation) => {
    setSelectedUser({
      user_id: profile.user_id ?? profile.id,
      display_name: profile.display_name,
      username: profile.username,
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#151821] text-slate-100">
      <aside className="flex w-[320px] flex-col border-r border-white/10 bg-[#1d212b]">
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Messages</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Teogram</h1>
          </div>
          <button
            onClick={() => void logout()}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5"
            aria-label="Log out"
          >
            <Icon name="logout" className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4">
          <input
            className="w-full rounded-2xl border border-white/10 bg-[#171a20] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="Search"
            type="text"
            value={searchQuery}
            onChange={handleSearch}
          />
          {searchResults.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#20242d]">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => selectConversation(result)}
                  className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 hover:bg-white/5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0a84ff]/15 text-xs font-semibold text-[#8ebdff]">
                    {result.display_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{result.display_name}</div>
                    <div className="text-xs text-slate-500">@{result.username}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex-1 overflow-y-auto px-3 pb-4">
          {conversations.map((conversation) => (
            <button
              key={conversation.user_id}
              type="button"
              onClick={() => selectConversation(conversation)}
              className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                selectedUser?.user_id === conversation.user_id ? 'bg-white/8' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-sm font-semibold">
                {conversation.display_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-100">{conversation.display_name}</div>
                <div className="truncate text-xs text-slate-500">@{conversation.username}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex flex-1 flex-col bg-[#151821]">
        {selectedUser ? (
          <>
            <header className="flex h-[76px] items-center justify-between border-b border-white/10 px-6">
              <div>
                <h2 className="text-xl font-semibold">{selectedUser.display_name}</h2>
                <p className="text-xs text-slate-500">End-to-end encrypted</p>
              </div>
            </header>

            <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[78%] ${
                    message.from_user_id === user?.id ? 'self-end text-right' : 'self-start'
                  }`}
                >
                  <div
                    className={`rounded-[22px] px-4 py-3 text-sm leading-6 ${
                      message.from_user_id === user?.id
                        ? 'rounded-br-[8px] bg-[#0a84ff] text-white'
                        : 'rounded-bl-[8px] bg-white/8 text-slate-100'
                    } ${message.isError ? 'opacity-70 italic' : ''}`}
                  >
                    {message.plaintext}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="border-t border-white/10 px-6 py-4">
              {sendError && (
                <div className="mb-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {sendError}
                </div>
              )}
              <div className="flex items-end gap-3">
                <textarea
                  className="min-h-[52px] max-h-[120px] flex-1 resize-none rounded-2xl border border-white/10 bg-[#1d212b] px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="Message"
                  rows={1}
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                />
                <button
                  type="submit"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0a84ff] text-white"
                >
                  <Icon name="send" className="h-5 w-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-center text-slate-400">
            <div>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/6">
                <Icon name="chat" className="h-8 w-8 text-[#8ebdff]" />
              </div>
              <h3 className="text-2xl font-semibold text-white">Select a conversation</h3>
              <p className="mt-2 text-sm text-slate-500">Search for a user or pick an existing thread.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
