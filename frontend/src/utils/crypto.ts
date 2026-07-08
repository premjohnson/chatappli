import nacl from "tweetnacl"
import util from "tweetnacl-util"

export const generateKeyPair = () => {

  const keyPair = nacl.box.keyPair()

  return {
    publicKey: util.encodeBase64(keyPair.publicKey),
    secretKey: util.encodeBase64(keyPair.secretKey)
  }
}

export const encryptMessage = (
  message: string,
  senderSecretKey: string,
  receiverPublicKey: string
) => {

  if (!senderSecretKey || !receiverPublicKey)
    throw new Error("Encryption keys missing")

  const nonce = nacl.randomBytes(nacl.box.nonceLength)

  const messageUint8 = util.decodeUTF8(message)

  const senderSecretKeyUint8 = util.decodeBase64(senderSecretKey)
  const receiverPublicKeyUint8 = util.decodeBase64(receiverPublicKey)

  if (
    senderSecretKeyUint8.length !== nacl.box.secretKeyLength ||
    receiverPublicKeyUint8.length !== nacl.box.publicKeyLength
  ) {
    throw new Error("Invalid key size")
  }

  const encrypted = nacl.box(
    messageUint8,
    nonce,
    receiverPublicKeyUint8,
    senderSecretKeyUint8
  )

  return {
    encryptedContent: util.encodeBase64(encrypted),
    nonce: util.encodeBase64(nonce)
  }
}

const isValidBase64 = (str: string): boolean => {
  if (!str || typeof str !== "string") return false
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(str)
}

export const decryptMessage = (
  encryptedContent: string,
  nonce: string,
  senderPublicKey: string,
  receiverSecretKey: string
) => {
  console.group("CRYPTO DECRYPT")
  console.log("encryptedContent", Boolean(encryptedContent))
  console.log("nonce", nonce)
  console.log("senderPublicKey", senderPublicKey)
  console.log("privateKeyLoaded", Boolean(receiverSecretKey))

  if (
    !isValidBase64(encryptedContent) ||
    !isValidBase64(nonce) ||
    !isValidBase64(senderPublicKey) ||
    !isValidBase64(receiverSecretKey)
  ) {
    console.log("decryptResult", "[Encrypted message]")
    console.log("reason", "invalid-base64-or-missing-input")
    console.groupEnd()
    return "[Encrypted message]"
  }

  try {

    const encryptedUint8 = util.decodeBase64(encryptedContent)
    const nonceUint8 = util.decodeBase64(nonce)

    const senderPublicKeyUint8 = util.decodeBase64(senderPublicKey)
    const receiverSecretKeyUint8 = util.decodeBase64(receiverSecretKey)

    const decrypted = nacl.box.open(
      encryptedUint8,
      nonceUint8,
      senderPublicKeyUint8,
      receiverSecretKeyUint8
    )

    if (!decrypted) {
      console.log("decryptResult", "[Encrypted message]")
      console.log("reason", "nacl-box-open-failed")
      console.groupEnd()
      return "[Encrypted message]"
    }

    const result = util.encodeUTF8(decrypted)
    console.log("decryptResult", result)
    console.log("reason", "success")
    console.groupEnd()
    return result

  } catch (err) {

    console.warn("Decryption failed", err)
    console.log("decryptResult", "[Encrypted message]")
    console.log("reason", "exception")
    console.groupEnd()
    return "[Encrypted message]"
  }
}
