const sign = require('./sign')

module.exports = async (inputs, callback, done) => {
  try {
    const resultPdfBuffer = await sign(
      Buffer.from(inputs.pdfContent, 'base64'),
      Buffer.from(inputs.certificateContent, 'base64'),
      inputs.password,
      inputs.reason)
    done(null, {
      pdfContent: resultPdfBuffer.toString('base64')
    })
  } catch (e) {
    done(null, {
      error: {
        message: e.message,
        stack: e.stack
      }
    })
  }
}
