'use client';

import React from 'react';
import Icon from './Icon';

export default function KeySetup() {
  return (
    <div className="animate-fade-in flex min-h-screen items-center justify-center overflow-hidden bg-[#1c1f26] px-6 py-10 antialiased">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(108,139,255,0.08),transparent_32%)]" />

      <main className="neo-panel animate-scale-in-soft relative z-10 flex w-full max-w-[420px] flex-col items-center rounded-[32px] px-7 py-10 text-center">
        <div className="neo-button mb-6 flex h-14 w-14 items-center justify-center rounded-[20px] text-[#9db4ff]">
          <Icon name="lock" className="h-6 w-6" />
        </div>

        <div className="neo-panel-soft mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          <Icon name="shield" className="h-4 w-4 text-[#9db4ff]" />
          Key setup
        </div>

        <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#333947] border-t-[#8ca8ff]" />
          <div className="neo-inset absolute inset-[10px] rounded-full" />
          <Icon name="shieldLock" className="relative z-10 h-8 w-8 text-[#b7c6ff]" />
        </div>

        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.04em] text-white">
          Generating your secure identity
        </h1>
        <p className="mt-4 max-w-[18rem] text-[14px] leading-7 text-slate-300">
          We’re creating your encryption keys locally so only you and your recipients can read what gets sent.
        </p>

        <div className="neo-inset mt-8 w-full rounded-[22px] px-4 py-4 text-left">
          <div className="mb-2 h-2.5 w-24 rounded-full bg-white/10" />
          <div className="h-2.5 w-full rounded-full bg-white/10" />
          <div className="mt-2 h-2.5 w-[70%] rounded-full bg-white/10" />
        </div>
      </main>
    </div>
  );
}
