'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const { login, register, isLoading } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      if (isLogin) {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password, displayName.trim());
      }
    } catch (value: unknown) {
      setError(value instanceof Error ? value.message : 'Authentication failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#16181d] px-4 py-8 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#1f232b] p-6 shadow-[0_28px_60px_rgba(0,0,0,0.45)]">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Teogram</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Private messaging with encryption handled in the browser.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="display_name">
                Display Name
              </label>
              <input
                id="display_name"
                className="w-full rounded-2xl border border-white/10 bg-[#171a20] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                placeholder="Display name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="w-full rounded-2xl border border-white/10 bg-[#171a20] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="w-full rounded-2xl border border-white/10 bg-[#171a20] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            className="w-full rounded-full bg-[#0a84ff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2891ff] disabled:opacity-50"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => setIsLogin((value) => !value)}
            className="font-semibold text-[#7fb2ff]"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
