import {defineField, defineType} from 'sanity'

export const heroType = defineType({
  name: 'heroImages',
  title: 'Zdjęcia za nagłówkiem strony',
  type: 'document',
  fields: [
    defineField({
      name: 'images',
      title: 'Zdjęcia',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'heroImage',
          title: 'Zdjęcie',
          fields: [
            defineField({
              name: 'image',
              title: 'Zdjęcie',
              type: 'image',
              options: {hotspot: true},
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'alt',
              title: 'Opis zdjęcia (dla niewidomych i SEO)',
              type: 'string',
              validation: (r) => r.required(),
            }),
          ],
          preview: {
            select: {title: 'alt', media: 'image'},
          },
        },
      ],
      options: {layout: 'grid'},
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Galeria zdjęć'}
    },
  },
})
