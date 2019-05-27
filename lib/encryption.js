const crypto = require('crypto')

const IV_LENGTH = 16 // For AES, this is always 16

function encrypt (text, secret, encryption) {
  let iv = crypto.randomBytes(IV_LENGTH)
  let cipher = crypto.createCipheriv(encryption, Buffer.from(secret), iv)
  let encrypted = cipher.update(text)

  encrypted = Buffer.concat([encrypted, cipher.final()])

  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decrypt (text, secret, encryption) {
  let textParts = text.split(':')
  let iv = Buffer.from(textParts.shift(), 'hex')
  let encryptedText = Buffer.from(textParts.join(':'), 'hex')
  let decipher = crypto.createDecipheriv(encryption, Buffer.from(secret), iv)
  let decrypted = decipher.update(encryptedText)

  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString()
}

module.exports = { decrypt, encrypt }
