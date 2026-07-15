import {defineField, defineType} from 'sanity'

export const articleType = defineType({
  name: 'article',
  title: 'Artykuł',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Tytuł',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Adres URL',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'coverImage',
      title: 'Zdjęcie główne',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'excerpt',
      title: 'Krótki opis (widoczny na liście artykułów)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'body',
      title: 'Treść',
      type: 'array',
      of: [
        {type: 'block'},
        {
          type: 'image',
          options: {hotspot: true},
          fields: [
            {name: 'alt', title: 'Opis zdjęcia', type: 'string'},
            {name: 'caption', title: 'Podpis', type: 'string'},
          ],
        },
      ],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Data publikacji',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {title: 'title', media: 'coverImage', date: 'publishedAt'},
    prepare({title, media, date}) {
      const dateStr = date ? new Date(date).toLocaleDateString('pl-PL') : 'brak daty'
      return {title, subtitle: dateStr, media}
    },
  },
  orderings: [
    {
      title: 'Data publikacji (najnowsze)',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],
})
