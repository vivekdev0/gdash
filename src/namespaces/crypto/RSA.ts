import { getSubtle } from "./common.js";


/**
 * String to Array Buffer
 * Copied from https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey
 */
function str2ab(str: string) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

/**
 * Array Buffer to Base64
 * Copied from https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey
 */
function abTob64(ab: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(ab);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Array Buffer to String
 * Copied from https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey
 */
function abToStr(ab: ArrayBuffer) {
  const decoder = new TextDecoder();
  return decoder.decode(ab);
}

async function importRsaPublicKey(pem: string) {
  // fetch the part of the PEM string between header and footer
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  const pemContents = pem.substring(
    pemHeader.length,
    pem.length - pemFooter.length - 1
  );
  // base64 decode the string to get the binary data
  const binaryDerString = atob(pemContents);
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString);

  const Subtle = await getSubtle();
  //! Note: spki can only encrypt;
  const key = await Subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
  return key;
}

async function importRsaPrivateKey(pem: string) {
  // fetch the part of the PEM string between header and footer
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem.substring(
    pemHeader.length,
    pem.length - pemFooter.length - 1
  );
  // base64 decode the string to get the binary data
  const binaryDerString = atob(pemContents);
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString);

  //! pkcs8 can only decrypt
  const Subtle = await getSubtle();
  const key = await Subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
  return key;
}

/**
 * ! Command to generate the public private key pair
 * ! openssl genrsa -out private_key.pem && openssl rsa -in private_key.pem -pubout -out publick_key.pem
 */
export const encryptRSA = async ({ data, pemEncodedPublicKey }: {
    data: string,
    pemEncodedPublicKey: string
}): Promise<string> => {
  const key = await importRsaPublicKey(pemEncodedPublicKey);
  const Subtle = await getSubtle();
  const result = await Subtle.encrypt(
    { name: "RSA-OAEP" },
    key,
    str2ab(data)
  );
  return abTob64(result);
};

export const decryptRSA = async ({
  dataInBase64, pemEncodedPPrivateKey
}:{
  pemEncodedPPrivateKey: string,
  dataInBase64: string
}): Promise<string> => {
  const key = await importRsaPrivateKey(pemEncodedPPrivateKey);
  const data = atob(dataInBase64);
  const Subtle = await getSubtle();
  const result = await Subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    key,
    str2ab(data)
  );

  return abToStr(result);
};
