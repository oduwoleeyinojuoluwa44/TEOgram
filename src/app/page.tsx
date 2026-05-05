'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthScreen from '@/components/AuthScreen';
import KeySetup from '@/components/KeySetup';
import ChatLayout from '@/components/ChatLayout';
import Icon from '@/components/Icon';

function SplashGate({ onEnter }: { onEnter: () => void }) {
  const highlights = [
    {
      title: 'End-to-end encrypted',
      description: 'Messages are encrypted before they leave your device.',
      icon: 'shieldLock' as const,
    },
    {
      title: 'Realtime delivery',
      description: 'Instant replies, unread counts, and live conversation updates.',
      icon: 'sync' as const,
    },
    {
      title: 'Private by design',
      description: 'Secure key setup, protected sessions, and focused one-to-one chat.',
      icon: 'chat' as const,
    },
  ];

  return (
    <div className="animate-fade-in flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#293149_0%,#1b1b1b_34%,#151515_100%)] px-4 py-8 font-plus-jakarta text-white">
      <div className="w-full max-w-[344px] rounded-[20px] border border-[#3b3b3b] bg-[#262626] px-5 py-6 shadow-[0_28px_60px_rgba(0,0,0,0.5)] animate-scale-in-soft">
        <div className="mb-5 flex items-center justify-between">
          <div className="neo-button flex h-14 w-14 items-center justify-center rounded-full border border-black/25 text-[#9db4ff]">
            <span className="text-[20px] font-semibold">T</span>
          </div>
          <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[#8db7ff]">
            Private chat
          </div>
        </div>

        <div className="animate-slide-up-soft">
          <h1 className="text-[28px] font-semibold tracking-[-0.05em] text-white">Teogram</h1>
          <p className="mt-3 text-[15px] leading-7 text-slate-300">
            Are you merlin and do you have semi good intentions?
          </p>
          <p className="mt-2 text-[14px] leading-6 text-slate-400">
            Secure one-to-one messaging with encrypted delivery, live replies, and a cleaner private
            space to talk.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {highlights.map((item, index) => (
            <div
              key={item.title}
              className="neo-inset animate-slide-up-soft rounded-[16px] border border-white/[0.04] px-4 py-3"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="neo-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/25 text-[#9db4ff]">
                  <Icon name={item.icon} className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold text-white">{item.title}</h2>
                  <p className="mt-1 text-[12px] leading-5 text-slate-400">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onEnter}
          className="neo-button mt-6 h-[50px] w-full rounded-full border border-black/25 text-[15px] font-semibold text-[#78b4ff] transition duration-200 hover:-translate-y-[1px] hover:text-[#9bc7ff]"
        >
          Enter Teogram
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading, isGeneratingKeys } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  const enterApp = () => {
    setShowSplash(false);
  };

  // Initial session restoration loading state
  if (isLoading && !isGeneratingKeys) {
    return (
      <div className="animate-fade-in flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#07090e_0%,#0b1020_100%)]">
        <div className="animate-scale-in-soft flex items-center gap-3 rounded-full border border-white/8 bg-white/6 px-5 py-3 text-sm font-medium text-slate-200 backdrop-blur-xl">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-[#0a84ff]"></div>
          <span>Loading your secure session…</span>
        </div>
      </div>
    );
  }

  // Cryptographic key generation state
  if (isGeneratingKeys) {
    return <KeySetup />;
  }

  if (!isAuthenticated && showSplash) {
    return <SplashGate onEnter={enterApp} />;
  }

  // Authenticated state
  if (isAuthenticated) {
    return <ChatLayout />;
  }

  // Guest state
  return <AuthScreen />;
}
