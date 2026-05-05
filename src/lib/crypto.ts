/**
 * WhisperBox Cryptography Utility
 * Implements E2EE using Web Crypto API:
 * - RSA-OAEP 2048 (Identity)
 * - AES-GCM 256 (Messages)
 * - PBKDF2 (Key Derivation)
 */

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
}

// Helper: Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return copyToArrayBuffer(bytes);
}

// Helper: ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer | ArrayBufferView): string {
  const bytes = buffer instanceof ArrayBuffer
    ? new Uint8Array(buffer)
    : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/**
 * 1. Generate Identity Keypair (RSA-OAEP 2048)
 */
export async function generateIdentityKeys(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // extractable (needed for wrapping)
    ["encrypt", "decrypt"]
  );
}

/**
 * 2. Derive Storage Key from Password (PBKDF2 -> AES-GCM)
 */
export async function deriveWrappingKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: copyToArrayBuffer(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * 3. Encrypt Private Key (AES-GCM)
 */
export async function wrapPrivateKey(privateKey: CryptoKey, wrappingKey: CryptoKey): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: copyToArrayBuffer(iv) },
    wrappingKey,
    exported
  );

  return JSON.stringify({
    alg: "PBKDF2-AES-GCM",
    iv: bufferToBase64(iv),
    data: bufferToBase64(encrypted),
  });
}

/**
 * 4. Decrypt Private Key (AES-GCM)
 */
export async function unwrapPrivateKey(wrappedBase64: string, wrappingKey: CryptoKey): Promise<CryptoKey> {
  const wrapped = JSON.parse(wrappedBase64) as { iv: string; data: string };
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(wrapped.iv) },
    wrappingKey,
    base64ToBuffer(wrapped.data)
  );

  return await window.crypto.subtle.importKey(
    "pkcs8",
    decrypted,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["decrypt"]
  );
}

/**
 * 5. Encrypt Message (AES-GCM + RSA-OAEP)
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: CryptoKey,
  senderPublicKey: CryptoKey
): Promise<EncryptedPayload> {
  // A. Generate random AES-GCM key and IV
  const sessionKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // B. Encrypt plaintext
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: copyToArrayBuffer(iv) },
    sessionKey,
    new TextEncoder().encode(plaintext)
  );

  // C. Export and Encrypt Session Key with RSA
  const rawSessionKey = await window.crypto.subtle.exportKey("raw", sessionKey);
  
  const encryptedKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    rawSessionKey
  );

  const encryptedKeyForSelf = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    senderPublicKey,
    rawSessionKey
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
    encryptedKey: bufferToBase64(encryptedKey),
    encryptedKeyForSelf: bufferToBase64(encryptedKeyForSelf),
  };
}

/**
 * 6. Decrypt Message (RSA-OAEP + AES-GCM)
 */
export async function decryptMessage(
  payload: EncryptedPayload | Omit<EncryptedPayload, "encryptedKeyForSelf">,
  privateKey: CryptoKey,
  isSender: boolean = false
): Promise<string> {
  const keyToUse = isSender && "encryptedKeyForSelf" in payload && payload.encryptedKeyForSelf
    ? payload.encryptedKeyForSelf
    : payload.encryptedKey;
  
  // A. Decrypt Session Key
  const rawSessionKey = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToBuffer(keyToUse)
  );

  const sessionKey = await window.crypto.subtle.importKey(
    "raw",
    rawSessionKey,
    "AES-GCM",
    false,
    ["decrypt"]
  );

  // B. Decrypt Ciphertext
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(payload.iv) },
    sessionKey,
    base64ToBuffer(payload.ciphertext)
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Helper: Export Public Key to Base64 (SPKI)
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  return bufferToBase64(exported);
}

/**
 * Helper: Import Public Key from Base64 (SPKI)
 */
export async function importPublicKey(base64: string): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    "spki",
    base64ToBuffer(base64),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  );
}
