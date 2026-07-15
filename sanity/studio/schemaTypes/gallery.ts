import {defineField, defineType} from 'sanity'

export const galleryType = defineType({
  name: 'gallery',
  title: 'Galeria zdjęć',
  type: 'document',
  fields: [
    defineField({
      name: 'images',
      title: 'Zdjęcia',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'galleryImage',
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
            defineField({
              name: 'caption',
              title: 'Podpis (widoczny pod zdjęciem)',
              type: 'string',
            }),
            defineField({
              name: 'captionUrl',
              title: 'Link pod podpisem (np. Google Maps)',
              type: 'url',
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
