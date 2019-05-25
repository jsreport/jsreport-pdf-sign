const sign = require('./sign')
const crypto = require('crypto')

const iv = crypto.randomBytes(16).toString('hex').slice(0, 16)

module.exports = function (reporter, definition) {
  reporter.documentStore.registerComplexType('PdfSignTemplateType', {
    certificateAssetShortid: { type: 'Edm.String' },
    reason: { type: 'Edm.String' },
    enabled: { type: 'Edm.Boolean' }
  })

  reporter.documentStore.model.entityTypes['TemplateType'].pdfSign = { type: 'jsreport.PdfSignTemplateType' }

  if (reporter.documentStore.model.entityTypes['AssetType']) {
    reporter.documentStore.registerComplexType('PdfSignAssetType', {
      passwordRaw: { type: 'Edm.String', visible: false },
      password: { type: 'Edm.String', visible: false },
      passwordFilled: { type: 'Edm.Boolean' },
      passwordEncryption: { type: 'Edm.String', visible: false }
    })

    reporter.documentStore.model.entityTypes['AssetType'].pdfSign = { type: 'jsreport.PdfSignAssetType' }
  }

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

      doc.pdfSign.passwordEncryption = doc.pdfSign.passwordEncryption || 'aes-256-ctr'
      doc.pdfSign.password = crypto.createCipheriv(doc.pdfSign.passwordEncryption, definition.options.secret, iv)
        .update(doc.pdfSign.passwordRaw, 'utf8', 'base64')
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

      u.$set.pdfSign.passwordEncryption = u.$set.passwordEncryption || 'aes-256-ctr'
      const cypher = crypto.createCipheriv(u.$set.pdfSign.passwordEncryption, definition.options.secret, crypto.randomBytes(16).toString('hex').slice(0, 16))
      const encrypted = cypher.update(u.$set.pdfSign.passwordRaw, 'utf8', 'base64')
      u.$set.pdfSign.password = encrypted + cypher.final('base64')

      u.$set.pdfSign.passwordRaw = null
      u.$set.pdfSign.passwordFilled = true
    })
  })

  reporter.afterRenderListeners.insert({ after: 'pdf-utils', before: 'scripts' }, 'pdfSign', async (req, res) => {
    if (!req.template.pdfSign || req.template.pdfSign.enabled === false) {
      return
    }

    let certificateAsset = req.template.pdfSign.certificateAsset

    if (req.template.pdfSign.certificateAssetShortid) {
      certificateAsset = await reporter.documentStore.collection('assets').findOne({ shortid: req.template.pdfSign.certificateAssetShortid }, req)

      if (!certificateAsset) {
        throw reporter.createError(`Asset with shortid ${req.template.docx.templateAssetShortid} was not found`, {
          statusCode: 400
        })
      }
      if (certificateAsset.pdfSign && certificateAsset.pdfSign.password) {
        certificateAsset.pdfSign.password = crypto.createDecipheriv(certificateAsset.passwordEncryption || 'aes-256-ctr', definition.options.secret, iv)
          .update(certificateAsset.pdfSign.password, 'base64', 'utf8')
      }
    } else {
      if (!Buffer.isBuffer(certificateAsset.content)) {
        certificateAsset.content = Buffer.from(certificateAsset.content, certificateAsset.encoding || 'utf8')
      }
    }

    res.content = await sign(res.content, certificateAsset.content, certificateAsset.password || req.template.pdfSign.password, req)
  })
}
