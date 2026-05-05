'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Icon from './Icon';

interface FieldErrors {
  username?: string;
  password?: string;
  displayName?: string;
  confirmPassword?: string;
}

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { login, register, isLoading } = useAuth();

  const validateForm = () => {
    const nextErrors: FieldErrors = {};

    if (!username.trim()) {
      nextErrors.username = 'Username is required';
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      nextErrors.username = 'Use 3-20 letters, numbers, or underscores';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      nextErrors.password = 'Use upper, lower, and a number';
    }

    if (!isLogin) {
      if (!displayName.trim()) {
        nextErrors.displayName = 'Display name is required';
      }

      if (!confirmPassword) {
        nextErrors.confirmPassword = 'Please confirm your password';
      } else if (confirmPassword !== password) {
        nextErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!validateForm()) {
      return;
    }

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

  const switchMode = () => {
    setIsLogin((current) => !current);
    setError('');
    setFieldErrors({});
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#16181d] px-4 py-8 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#1f232b] p-6 shadow-[0_28px_60px_rgba(0,0,0,0.45)]">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Teogram</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
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
              {fieldErrors.displayName && <p className="mt-1 text-xs text-red-200">{fieldErrors.displayName}</p>}
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
            {fieldErrors.username && <p className="mt-1 text-xs text-red-200">{fieldErrors.username}</p>}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="password">
              Password
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#171a20] px-4 py-3">
              <input
                id="password"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="text-slate-400"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-4 w-4" />
              </button>
            </div>
            {fieldErrors.password && <p className="mt-1 text-xs text-red-200">{fieldErrors.password}</p>}
          </div>

          {!isLogin && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="confirm_password">
                Confirm Password
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#171a20] px-4 py-3">
                <input
                  id="confirm_password"
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="Confirm password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="text-slate-400"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  <Icon name={showConfirmPassword ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-200">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          )}

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
          <button type="button" onClick={switchMode} className="font-semibold text-[#7fb2ff]">
            {isLogin ? 'SignUp' : 'SignIn'}
          </button>
        </div>
      </div>
    </div>
  );
}
