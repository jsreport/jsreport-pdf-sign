import TemplateProperties from './TemplateProperties'
import AssetProperties from './AssetProperties'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent(TemplateProperties.title, TemplateProperties, (entity) => entity.__entitySet === 'templates' && entity.recipe.includes('pdf'))
Studio.addPropertiesComponent(AssetProperties.title, AssetProperties, (entity) => entity.__entitySet === 'assets' && entity.name && entity.name.includes('.p12'))

Studio.addApiSpec({
  template: {
    pdfSign: {
      certificateAsset: {
        encoding: '...',
        content: '...',
        password: '...'
      },
      certificateAssetShortid: '...',
      enabled: true
    }
  }
})
