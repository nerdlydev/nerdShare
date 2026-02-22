import type { SignalPayload } from "@nerdshare/shared";

// ─── Native Web Crypto API RSA-OAEP Wrapper ───
// Built-in browser crypto, zero dependencies, hardware-accelerated where possible.

const RSA_ALGORITHM = {
  name: "RSA-OAEP",
  modulusLength: 2048, // 2048-bit is standard for rapid signaling.
  publicExponent: new Uint8Array([1, 0, 1]), // 65537
  hash: "SHA-256",
};

/**
 * Generates an RSA-OAEP key pair for encrpyting WebRTC signaling.
 */
export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    RSA_ALGORITHM,
    true, // extractable (so we can export the public key)
    ["encrypt", "decrypt"],
  );
}

/**
 * Exports a public CryptoKey to a Base64 SPKI string to send to the server.
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}

/**
 * Imports a Base64 SPKI string from the server back into a CryptoKey.
 */
export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const actBuffer = base64ToArrayBuffer(base64);
  return await window.crypto.subtle.importKey(
    "spki",
    actBuffer,
    RSA_ALGORITHM,
    true,
    ["encrypt"],
  );
}

interface HybridEnvelope {
  encryptedKey: string; // Base64 of RSA(AES_Key)
  iv: string; // Base64 of AES IV
  ciphertext: string; // Base64 of AES(Payload)
}

/**
 * Stringifies a SignalPayload, encrypts it using Hybrid Encryption
 * (AES-GCM for data, RSA for the AES key), and returns a Base64 JSON envelope.
 */
export async function encryptPayload(
  targetPublicKey: CryptoKey,
  payload: SignalPayload,
): Promise<string> {
  // 1. Generate a single-use 256-bit AES-GCM key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  // 2. Encrypt the payload string with AES
  // We use a random 12-byte IV for GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const jsonString = JSON.stringify(payload);
  const encoded = new TextEncoder().encode(jsonString);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoded,
  );

  // 3. Export the raw AES key & encrypt it with RSA
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const encryptedAesKeyBuffer = await window.crypto.subtle.encrypt(
    RSA_ALGORITHM,
    targetPublicKey,
    rawAesKey,
  );

  // 4. Package envelope
  const envelope: HybridEnvelope = {
    encryptedKey: arrayBufferToBase64(encryptedAesKeyBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
  };

  return btoa(JSON.stringify(envelope));
}

/**
 * Unpacks the HybridEnvelope, decrypts the AES key via RSA,
 * decrypts the payload via AES, and returns the SignalPayload object.
 */
export async function decryptPayload(
  privateKey: CryptoKey,
  envelopeBase64: string,
): Promise<SignalPayload> {
  // 1. Unpack envelope
  const envelopeJson = atob(envelopeBase64);
  const envelope: HybridEnvelope = JSON.parse(envelopeJson);

  // 2. Decrypt AES key using RSA
  const encryptedKeyBuffer = base64ToArrayBuffer(envelope.encryptedKey);
  const rawAesKeyBuffer = await window.crypto.subtle.decrypt(
    RSA_ALGORITHM,
    privateKey,
    encryptedKeyBuffer,
  );

  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    rawAesKeyBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );

  // 3. Decrypt the payload using AES
  const ivBuffer = base64ToArrayBuffer(envelope.iv);
  const ciphertextBuffer = base64ToArrayBuffer(envelope.ciphertext);

  const decryptedPayloadBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
    aesKey,
    ciphertextBuffer,
  );

  // 4. Decode JSON
  const jsonString = new TextDecoder().decode(decryptedPayloadBuffer);
  return JSON.parse(jsonString) as SignalPayload;
}

// ─── Encoding Helpers ───

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}
