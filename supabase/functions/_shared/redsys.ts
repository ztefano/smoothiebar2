// Implementación del algoritmo de firma de Redsys (TPV Virtual, versión
// HMAC_SHA256_V1) para el flujo de "Redirección". Referencia: guía de
// integración de Redsys para comercios ("Integración redirección").
//
// Pasos:
// 1. Ds_MerchantParameters = Base64(JSON de los parámetros del comercio).
// 2. Se deriva una clave de operación cifrando el Ds_Merchant_Order (con
//    padding de ceros a múltiplo de 8 bytes) con 3DES-CBC usando la clave
//    secreta del comercio (provista por el banco) e IV de 8 bytes en cero.
// 3. Ds_Signature = Base64(HMAC-SHA256(claveOperacion, Ds_MerchantParameters)).
//
// IMPORTANTE: validar esta implementación contra el entorno de pruebas
// (sandbox) de Redsys antes de usarla en producción — ver docs/SETUP.md.
import forge from "npm:node-forge@1.3.1";

export interface RedsysSignedRequest {
  Ds_SignatureVersion: "HMAC_SHA256_V1";
  Ds_MerchantParameters: string;
  Ds_Signature: string;
}

function zeroPadTo8(bytes: Uint8Array): Uint8Array {
  const remainder = bytes.length % 8;
  if (remainder === 0) return bytes;
  const padded = new Uint8Array(bytes.length + (8 - remainder));
  padded.set(bytes);
  return padded;
}

function bytesToForgeBuffer(bytes: Uint8Array): forge.util.ByteStringBuffer {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return forge.util.createBuffer(binary, "binary");
}

function forgeBufferToBytes(buffer: forge.util.ByteStringBuffer): Uint8Array {
  const out = new Uint8Array(buffer.length());
  for (let i = 0; i < out.length; i++) out[i] = buffer.at(i);
  return out;
}

/** Cifra `data` (ya alineado a 8 bytes) con 3DES-CBC, sin padding adicional. */
function encrypt3DesNoPadding(key: Uint8Array, data: Uint8Array): Uint8Array {
  const cipher = forge.cipher.createCipher("3DES-CBC", bytesToForgeBuffer(key));
  cipher.start({ iv: bytesToForgeBuffer(new Uint8Array(8)) });
  // Redsys no usa PKCS7: el mensaje ya viene alineado a 8 bytes con ceros.
  cipher.mode.pad = () => true;
  cipher.mode.unpad = () => true;
  cipher.update(bytesToForgeBuffer(data));
  cipher.finish();
  return forgeBufferToBytes(cipher.output);
}

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

export async function signRedsysRequest(
  merchantKeyBase64: string,
  merchantParameters: Record<string, string>
): Promise<RedsysSignedRequest> {
  const merchantParametersJson = JSON.stringify(merchantParameters);
  const merchantParametersB64 = btoa(merchantParametersJson);

  const secretKey = Uint8Array.from(atob(merchantKeyBase64), (c) => c.charCodeAt(0));
  const orderBytes = zeroPadTo8(new TextEncoder().encode(merchantParameters.DS_MERCHANT_ORDER));
  const operationKey = encrypt3DesNoPadding(secretKey, orderBytes);

  const signatureBytes = await hmacSha256(operationKey, merchantParametersB64);
  const signature = btoa(String.fromCharCode(...signatureBytes));

  return {
    Ds_SignatureVersion: "HMAC_SHA256_V1",
    Ds_MerchantParameters: merchantParametersB64,
    Ds_Signature: signature,
  };
}

/** Verifica la firma que Redsys envía en la notificación (webhook). */
export async function verifyRedsysNotification(
  merchantKeyBase64: string,
  merchantParametersB64: string,
  receivedSignature: string
): Promise<{ valid: boolean; params: Record<string, string> }> {
  const json = atob(merchantParametersB64.replace(/-/g, "+").replace(/_/g, "/"));
  const params = JSON.parse(json) as Record<string, string>;

  const secretKey = Uint8Array.from(atob(merchantKeyBase64), (c) => c.charCodeAt(0));
  const orderBytes = zeroPadTo8(new TextEncoder().encode(params.Ds_Order));
  const operationKey = encrypt3DesNoPadding(secretKey, orderBytes);

  const signatureBytes = await hmacSha256(operationKey, merchantParametersB64);
  const expected = btoa(String.fromCharCode(...signatureBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return { valid: expected === receivedSignature, params };
}

/** Genera un número de pedido válido para Redsys: 4 dígitos + 8 alfanuméricos. */
export function generateOrderId(): string {
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  const rest = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${digits}${rest}`;
}
