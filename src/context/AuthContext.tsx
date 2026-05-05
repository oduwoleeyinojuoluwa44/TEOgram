'use client';

import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import * as crypto from '@/lib/crypto';
import { auth as authApi, clearSessionTokens, storeSessionTokens, type UserProfile } from '@/lib/api';

const KEY_DB_NAME = 'teogram-key-store';
const KEY_STORE_NAME = 'private-keys';

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY_DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(KEY_STORE_NAME);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePrivateKey(userId: string, privateKey: CryptoKey) {
  const db = await openKeyDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE_NAME, 'readwrite');
    transaction.objectStore(KEY_STORE_NAME).put(privateKey, userId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function loadPrivateKey(userId: string): Promise<CryptoKey | null> {
  const db = await openKeyDatabase();
  const key = await new Promise<CryptoKey | null>((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE_NAME, 'readonly');
    const request = transaction.objectStore(KEY_STORE_NAME).get(userId);
    request.onsuccess = () => resolve((request.result as CryptoKey | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return key;
}

async function deletePrivateKey(userId: string) {
  const db = await openKeyDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE_NAME, 'readwrite');
    transaction.objectStore(KEY_STORE_NAME).delete(userId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

interface AuthContextType {
  user: UserProfile | null;
  privateKey: CryptoKey | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGeneratingKeys: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);

  const logout = useCallback(() => {
    clearSessionTokens();
    if (user?.id) {
      void deletePrivateKey(user.id).catch(() => undefined);
    }
    setUser(null);
    setPrivateKey(null);
  }, [user]);

  // Persistence: Try to restore session on load
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = sessionStorage.getItem('access_token');
        if (token) {
          try {
            const profile = await authApi.me();
            const storedPrivateKey = await loadPrivateKey(profile.id);
            if (!storedPrivateKey) {
              clearSessionTokens();
            } else {
              setPrivateKey(storedPrivateKey);
              setUser(profile);
            }
          } catch {
            clearSessionTokens();
          }
        } else if (localStorage.getItem('access_token') || localStorage.getItem('refresh_token')) {
          clearSessionTokens();
        }
      } catch {
        clearSessionTokens();
      }
      setIsLoading(false);
    };
    restoreSession();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setPrivateKey(null);
    };

    window.addEventListener('teogram:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('teogram:unauthorized', handleUnauthorized);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.login({ username, password });
      
      storeSessionTokens(response.access_token, response.refresh_token);

      if (!response.user.pbkdf2_salt || !response.user.wrapped_private_key) {
        throw new Error('Missing encrypted private key material for this account');
      }

      const salt = new Uint8Array(
        atob(response.user.pbkdf2_salt).split('').map(c => c.charCodeAt(0))
      );
      const wrappingKey = await crypto.deriveWrappingKey(password, salt);
      const privKey = await crypto.unwrapPrivateKey(response.user.wrapped_private_key, wrappingKey);
      
      setPrivateKey(privKey);
      setUser(response.user);
      await savePrivateKey(response.user.id, privKey);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string, displayName: string) => {
    setIsGeneratingKeys(true);
    try {
      const keyPair = await crypto.generateIdentityKeys();
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const wrappingKey = await crypto.deriveWrappingKey(password, salt);
      
      const publicKeyBase64 = await crypto.exportPublicKey(keyPair.publicKey);
      const wrappedPrivKeyBase64 = await crypto.wrapPrivateKey(keyPair.privateKey, wrappingKey);
      const saltBase64 = btoa(String.fromCharCode(...Array.from(salt)));

      const response = await authApi.register({
        username,
        password,
        display_name: displayName,
        public_key: publicKeyBase64,
        wrapped_private_key: wrappedPrivKeyBase64,
        pbkdf2_salt: saltBase64
      });

      storeSessionTokens(response.access_token, response.refresh_token);
      const storedPrivateKey = await crypto.unwrapPrivateKey(wrappedPrivKeyBase64, wrappingKey);
      
      setPrivateKey(storedPrivateKey);
      setUser(response.user);
      await savePrivateKey(response.user.id, storedPrivateKey);
    } finally {
      setIsGeneratingKeys(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      privateKey, 
      isAuthenticated: !!user, 
      isLoading,
      isGeneratingKeys,
      login, 
      register, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
