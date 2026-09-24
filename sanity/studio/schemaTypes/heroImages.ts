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
            defineField({
              name: 'mobileOnly',
              title: 'Tylko na telefonie (mobile-only)',
              description: 'Zdjęcie wyświetla się tylko na ekranach węższych niż 780px.',
              type: 'boolean',
              options: {layout: 'checkbox'},
              validation: (r) =>
                r.custom((value, context) => {
                  const parent = context.parent as {desktopOnly?: boolean} | undefined
                  return value && parent?.desktopOnly
                    ? 'Nie można zaznaczyć jednocześnie "tylko telefon" i "tylko komputer".'
                    : true
                }),
            }),
            defineField({
              name: 'desktopOnly',
              title: 'Tylko na komputerze (desktop-only)',
              description:
                'Zdjęcie wyświetla się tylko na ekranach szerszych niż 780px. Gdy żadna opcja nie jest zaznaczona, zdjęcie wyświetla się zawsze.',
              type: 'boolean',
              options: {layout: 'checkbox'},
            }),
          ],
          preview: {
            select: {
              title: 'alt',
              media: 'image',
              mobileOnly: 'mobileOnly',
              desktopOnly: 'desktopOnly',
            },
            prepare({title, media, mobileOnly, desktopOnly}) {
              const subtitle = mobileOnly
                ? 'Tylko telefon'
                : desktopOnly
                  ? 'Tylko komputer'
                  : undefined
              return {title, media, subtitle}
            },
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
