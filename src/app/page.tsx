'use client';

import { useAuth } from '@/context/AuthContext';
import AuthScreen from '@/components/AuthScreen';
import KeySetup from '@/components/KeySetup';

export default function Home() {
  const { isAuthenticated, isLoading, isGeneratingKeys } = useAuth();

  if (isLoading && !isGeneratingKeys) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#11141a] text-slate-200">
        <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium">
          Loading your secure session...
        </div>
      </div>
    );
  }

  if (isGeneratingKeys) {
    return <KeySetup />;
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#11141a] text-slate-200">
        <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium">
          Chat is loading...
        </div>
      </div>
    );
  }

  return <AuthScreen />;
}
