const sign = require('./sign')
const { encrypt, decrypt } = require('./encryption')
const defaultEncryption = 'aes-128-ctr'

module.exports = function (reporter, definition) {
  if (definition.options.secret && definition.options.secret.length !== 16) {
    throw reporter.createError('pdf-sign secret filled but needs to have 16 chars length')
  }

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
        passwordSecure: { type: 'Edm.String', visible: false },
        passwordFilled: { type: 'Edm.Boolean' },
        // eventually this can help us in the future to support something new with back compatibility
        passwordEncryption: { type: 'Edm.String', visible: false }
      })

      reporter.documentStore.model.entityTypes['AssetType'].pdfSign = { type: 'jsreport.PdfSignAssetType' }
    }
  })

  reporter.initializeListeners.add('pdf-sign', () => {
    if (!reporter.documentStore.collection('assets')) {
      return
    }

    reporter.documentStore.collection('assets').beforeInsertListeners.add('pdf-sign', (doc, req) => {
      if (!doc.pdfSign || !doc.pdfSign.passwordRaw) {
        return
      }

      if (!definition.options.secret) {
        throw reporter.createError('Setting password for pdf sign requires configuring secret in extensions.pdfSign.secret')
      }

      doc.pdfSign.passwordEncryption = doc.pdfSign.passwordEncryption || defaultEncryption
      doc.pdfSign.passwordSecure = encrypt(doc.pdfSign.passwordRaw, definition.options.secret, doc.pdfSign.passwordEncryption)

      doc.pdfSign.passwordRaw = null
      doc.pdfSign.passwordFilled = true
    })

    reporter.documentStore.collection('assets').beforeUpdateListeners.add('pdf-sign', (q, u, req) => {
      if (!u.$set.pdfSign || !u.$set.pdfSign.passwordRaw) {
        return
      }

      if (!definition.options.secret) {
        throw reporter.createError('Setting password for pdf sign requires configuring secret in extensions.pdfSign.secret')
      }

      u.$set.pdfSign.passwordEncryption = u.$set.passwordEncryption || defaultEncryption
      u.$set.pdfSign.passwordSecure = encrypt(u.$set.pdfSign.passwordRaw, definition.options.secret, u.$set.pdfSign.passwordEncryption)

      u.$set.pdfSign.passwordRaw = null
      u.$set.pdfSign.passwordFilled = true
    })
  })

  reporter.afterRenderListeners.insert({ after: 'pdf-utils', before: 'scripts' }, 'pdfSign', async (req, res) => {
    if (!req.template.pdfSign || req.template.pdfSign.enabled === false) {
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
        password = decrypt(certificateAsset.pdfSign.passwordSecure, definition.options.secret, certificateAsset.pdfSign.passwordEncryption || defaultEncryption)
      }
    } else {
      if (!Buffer.isBuffer(certificateAsset.content)) {
        certificateAsset.content = Buffer.from(certificateAsset.content, certificateAsset.encoding || 'utf8')
      }
    }

    reporter.logger.debug('Signing the output pdf with certificate', req)
    res.content = await sign(res.content, certificateAsset.content, password, req)
  })
}
