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
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login, register, isLoading } = useAuth();

  const validateForm = () => {
    const nextErrors: FieldErrors = {};
    const trimmedUsername = username.trim();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedUsername) {
      nextErrors.username = 'Username is required';
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
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
      if (!trimmedDisplayName) {
        nextErrors.displayName = 'Display name is required';
      } else if (trimmedDisplayName.length < 2) {
        nextErrors.displayName = 'Display name must be at least 2 characters';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  const switchMode = (nextIsLogin: boolean) => {
    setIsLogin(nextIsLogin);
    setError('');
    setFieldErrors({});
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const getInputClassName = (hasError: boolean) => (
    `h-[42px] w-full bg-transparent text-[14px] text-white outline-none placeholder:text-[#747474] ${
      hasError ? 'text-[#ffd0d0]' : ''
    }`
  );

  return (
    <div className="animate-fade-in flex min-h-screen items-center justify-center bg-[#1b1b1b] px-4 py-8 font-plus-jakarta text-white">
      <div className="w-full max-w-[288px] rounded-[14px] border border-[#3b3b3b] bg-[#262626] px-4 pb-5 pt-4 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-[21px] font-semibold leading-none text-white">
              {isLogin ? 'Login' : 'Register'}
            </h1>
            <p className="mt-2 text-[13px] text-[#d2d2d2]">
              {isLogin ? 'Hi, Welcome back' : 'Create your secure account'}
            </p>
          </div>

          <button
            type="button"
            className="neo-button flex h-10 w-10 items-center justify-center rounded-full border border-black/25 text-[#8f949d]"
            aria-label="Theme"
          >
            <Icon name="shieldLock" className="h-4 w-4" />
          </button>
        </div>

        <form className="flex flex-col" onSubmit={handleSubmit}>
            {error && (
              <div className="mb-3 rounded-[10px] border border-[#4d2f2f] bg-[#372424] px-3 py-2 text-[12px] text-[#ffc8c8]">
                {error}
              </div>
            )}

          {!isLogin && (
            <div className="mb-4">
              <label className="mb-2 block text-[12px] font-semibold text-[#efefef]" htmlFor="display_name">
                Display Name
              </label>
              <div className={`rounded-[6px] border bg-[#2a2a2a] shadow-[inset_0_4px_10px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.04)] ${fieldErrors.displayName ? 'border-[#a85454]' : 'border-[#3d3d3d]'}`}>
                <input
                  id="display_name"
                  className={getInputClassName(Boolean(fieldErrors.displayName))}
                  placeholder="display name"
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setFieldErrors((current) => ({ ...current, displayName: undefined }));
                  }}
                  disabled={isLoading}
                  required={!isLogin}
                  aria-invalid={Boolean(fieldErrors.displayName)}
                />
              </div>
              {fieldErrors.displayName && (
                <p className="mt-1 text-[11px] text-[#ffb4b4]">{fieldErrors.displayName}</p>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-2 block text-[12px] font-semibold text-[#efefef]" htmlFor="username">
              Username
            </label>
            <div className={`flex items-center rounded-[6px] border bg-[#2a2a2a] px-3 shadow-[inset_0_4px_10px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.04)] ${fieldErrors.username ? 'border-[#a85454]' : 'border-[#3d3d3d]'}`}>
              <Icon name="chat" className="h-4 w-4 shrink-0 text-[#6d6d6d]" />
              <input
                id="username"
                className={`${getInputClassName(Boolean(fieldErrors.username))} pl-3`}
                placeholder="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setFieldErrors((current) => ({ ...current, username: undefined }));
                }}
                disabled={isLoading}
                required
                autoCapitalize="none"
                autoCorrect="off"
                aria-invalid={Boolean(fieldErrors.username)}
              />
            </div>
            {fieldErrors.username && (
              <p className="mt-1 text-[11px] text-[#ffb4b4]">{fieldErrors.username}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-[12px] font-semibold text-[#efefef]" htmlFor="password">
              Password
            </label>
            <div className={`flex items-center rounded-[6px] border bg-[#2a2a2a] px-3 shadow-[inset_0_4px_10px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.04)] ${fieldErrors.password ? 'border-[#a85454]' : 'border-[#3d3d3d]'}`}>
              <Icon name="lock" className="h-4 w-4 shrink-0 text-[#6d6d6d]" />
              <input
                id="password"
                className={`${getInputClassName(Boolean(fieldErrors.password))} pl-3`}
                placeholder="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((current) => ({
                    ...current,
                    password: undefined,
                    confirmPassword: current.confirmPassword === 'Passwords do not match' ? undefined : current.confirmPassword,
                  }));
                }}
                disabled={isLoading}
                required
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="ml-2 text-[#7d828a] transition hover:text-[#b7bcc4]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-4 w-4" />
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-[11px] text-[#ffb4b4]">{fieldErrors.password}</p>
            )}
          </div>

          {!isLogin && (
            <div className="mb-4">
              <label className="mb-2 block text-[12px] font-semibold text-[#efefef]" htmlFor="confirm_password">
                Confirm Password
              </label>
              <div className={`flex items-center rounded-[6px] border bg-[#2a2a2a] px-3 shadow-[inset_0_4px_10px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.04)] ${fieldErrors.confirmPassword ? 'border-[#a85454]' : 'border-[#3d3d3d]'}`}>
                <Icon name="lock" className="h-4 w-4 shrink-0 text-[#6d6d6d]" />
                <input
                  id="confirm_password"
                  className={`${getInputClassName(Boolean(fieldErrors.confirmPassword))} pl-3`}
                  placeholder="confirm password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
                  }}
                  disabled={isLoading}
                  required={!isLogin}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="ml-2 text-[#7d828a] transition hover:text-[#b7bcc4]"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  <Icon name={showConfirmPassword ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-[11px] text-[#ffb4b4]">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          )}

          <div className="mb-5 flex items-center justify-between">
            <label className="flex items-center gap-2 text-[12px] text-[#8f8f8f]">
              <span className="neo-button flex h-5 w-5 items-center justify-center rounded-[5px] border border-black/25">
                {rememberMe && <span className="h-2.5 w-2.5 rounded-[2px] bg-[#b9bcc2]" />}
              </span>
              <input
                type="checkbox"
                className="hidden"
                checked={rememberMe}
                onChange={() => setRememberMe((value) => !value)}
              />
              Remember me
            </label>
            <button type="button" className="text-[12px] font-medium text-[#3a8dff] transition hover:text-[#67a8ff]">
              {isLogin ? 'Forgot password?' : 'Use a strong password'}
            </button>
          </div>

          <button
            className="mb-5 h-[46px] rounded-full border border-black/30 bg-[linear-gradient(180deg,#2f2f2f,#252525)] text-[15px] font-semibold text-[#2d9cff] shadow-[0_10px_18px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-200 hover:translate-y-[-1px] hover:text-[#58adff] disabled:opacity-50"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
          </button>

          <div className="text-center text-[13px] text-[#d7d7d7]">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => switchMode(!isLogin)}
              className="font-medium text-[#3495ff] transition hover:text-[#69b4ff]"
            >
              {isLogin ? 'SignUp' : 'SignIn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
