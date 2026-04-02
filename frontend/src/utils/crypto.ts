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

export const decryptMessage = (
  encryptedContent: string,
  nonce: string,
  senderPublicKey: string,
  receiverSecretKey: string
) => {

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

    if (!decrypted) return null

    return util.encodeUTF8(decrypted)

  } catch (err) {

    console.warn("Decryption failed", err)
    return null
  }
}