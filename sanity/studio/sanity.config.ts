import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

const SINGLETONS = ['gallery', 'roomsSlider', 'siteSettings', 'heroImages', 'importantInfo']

export default defineConfig({
  name: 'default',
  title: 'Willa Ewa',

  projectId: 'csed1mdo',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Panel')
          .items([
            S.listItem()
              .title('Zdjęcia hero')
              .id('heroImages')
              .child(
                S.document()
                  .schemaType('heroImages')
                  .documentId('heroImages')
              ),
            S.listItem()
              .title('Zdjęcia pokoi')
              .id('roomsSlider')
              .child(S.document().schemaType('roomsSlider').documentId('roomsSlider')),
            S.listItem()
              .title('Galeria zdjęć')
              .id('gallery')
              .child(S.document().schemaType('gallery').documentId('gallery')),

            S.listItem()
              .title('Ważne informacje')
              .id('importantInfo')
              .child(
                S.document()
                  .schemaType('importantInfo')
                  .documentId('importantInfo')
              ),

            S.divider(),
            S.listItem()
              .title('Ustawienia strony')
              .id('siteSettings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter(({schemaType}) => !SINGLETONS.includes(schemaType)),
  },
})
