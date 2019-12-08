const path = require('path')
const missingSecretMessage = 'pdf-sign extension uses encryption to store sensitive data and needs secret key to be defined. Please fill "encryption.secretKey" at the root of the config or disable encryption using "encryption.enabled=false".'

module.exports = function (reporter, definition) {
  reporter.documentStore.registerComplexType('PdfSignTemplateType', {
    certificateAssetShortid: { type: 'Edm.String' },
    reason: { type: 'Edm.String' },
    enabled: { type: 'Edm.Boolean' }
  })

  reporter.documentStore.model.entityTypes['TemplateType'].pdfSign = { type: 'jsreport.PdfSignTemplateType' }

  reporter.documentStore.on('before-init', () => {
    if (reporter.documentStore.model.entityTypes['AssetType']) {
      reporter.documentStore.registerComplexType('PdfSignAssetType', {
        passwordRaw: { type: 'Edm.String', visible: false },
        passwordSecure: { type: 'Edm.String', encrypted: true, visible: false },
        passwordFilled: { type: 'Edm.Boolean' }
      })

      reporter.documentStore.model.entityTypes['AssetType'].pdfSign = { type: 'jsreport.PdfSignAssetType' }
    }
  })

  reporter.initializeListeners.add('pdf-sign', () => {
    if (!reporter.documentStore.collection('assets')) {
      return
    }

    reporter.documentStore.collection('assets').beforeInsertListeners.add('pdf-sign', async (doc, req) => {
      if (!doc.pdfSign || !doc.pdfSign.passwordRaw) {
        return
      }

      try {
        doc.pdfSign.passwordSecure = await reporter.encryption.encrypt(doc.pdfSign.passwordRaw)
      } catch (e) {
        if (e.encryptionNoSecret) {
          e.message = missingSecretMessage
        }

        throw e
      }

      doc.pdfSign.passwordRaw = null
      doc.pdfSign.passwordFilled = true
    })

    reporter.documentStore.collection('assets').beforeUpdateListeners.add('pdf-sign', async (q, u, req) => {
      if (!u.$set.pdfSign || !u.$set.pdfSign.passwordRaw) {
        return
      }

      try {
        u.$set.pdfSign.passwordSecure = await reporter.encryption.encrypt(u.$set.pdfSign.passwordRaw)
      } catch (e) {
        if (e.encryptionNoSecret) {
          e.message = missingSecretMessage

        }

        throw e
      }

      u.$set.pdfSign.passwordRaw = null
      u.$set.pdfSign.passwordFilled = true
    })
  })

  reporter.afterRenderListeners.insert({ after: 'pdf-utils', before: 'scripts' }, 'pdfSign', async (req, res) => {
    if (!req.template.pdfSign || req.template.pdfSign.enabled === false) {
      return
    }

    if (res.meta.contentType !== 'application/pdf') {
      return
    }

    let password = req.template.pdfSign.certificateAsset ? req.template.pdfSign.certificateAsset.password : null

    let certificateAsset = req.template.pdfSign.certificateAsset

    if (req.template.pdfSign.certificateAssetShortid) {
      certificateAsset = await reporter.documentStore.collection('assets').findOne({ shortid: req.template.pdfSign.certificateAssetShortid }, req)

      if (!certificateAsset) {
        throw reporter.createError(`Asset with shortid ${req.template.pdfSign.certificateAssetShortid} was not found`, {
          statusCode: 400
        })
      }
      if (certificateAsset.pdfSign && certificateAsset.pdfSign.passwordSecure) {
        try {
          password = await reporter.encryption.decrypt(certificateAsset.pdfSign.passwordSecure)
        } catch (e) {
          if (e.encryptionNoSecret) {
            e.message = missingSecretMessage
          } else if (e.encryptionDecryptFail) {
            e.message = 'pdf-sign data decrypt failed, looks like secret key value is different to the key used to encrypt sensitive data, make sure "encryption.secretKey" was not changed'
          }

          throw e
        }
      }
    } else {
      if (!Buffer.isBuffer(certificateAsset.content)) {
        certificateAsset.content = Buffer.from(certificateAsset.content, certificateAsset.encoding || 'utf8')
      }
    }

    reporter.logger.debug('Signing the output pdf with certificate', req)
    const result = await reporter.executeScript({
      pdfContent: res.content.toString('base64'),
      password,
      reason: req.template.pdfSign.reason,
      certificateContent: certificateAsset.content.toString('base64')
    }, {
      execModulePath: path.join(__dirname, 'scriptPdfSign.js')
    }, req)

    if (result.error) {
      const error = new Error(result.error.message)
      error.stack = result.error.stack

      throw reporter.createError('Error while signing pdf', {
        original: error,
        weak: true
      })
    }

    res.content = Buffer.from(result.pdfContent, 'base64')
  })
}
