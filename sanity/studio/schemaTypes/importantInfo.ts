import {defineField, defineType} from 'sanity'

export const importantInfoType = defineType({
  name: 'importantInfo',
  title: 'Ważne informacje',
  type: 'document',
  fields: [
    defineField({
      name: 'items',
      title: 'Pozycje',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'importantInfoItem',
          title: 'Informacja',
          fields: [
            defineField({
              name: 'icon',
              title: 'Ikona (SVG)',
              type: 'image',
              options: {accept: 'image/svg+xml'},
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'label',
              title: 'Nazwa pola',
              description: 'np. "Godzina zameldowania"',
              type: 'string',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'value',
              title: 'Treść',
              description: 'np. "15:00 – 20:00"',
              type: 'string',
              validation: (r) => r.required(),
            }),
          ],
          preview: {
            select: {title: 'label', subtitle: 'value', media: 'icon'},
          },
        },
      ],
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Ważne informacje'}
    },
  },
})
