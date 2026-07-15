import {defineField, defineType} from 'sanity'

export const roomsSliderType = defineType({
  name: 'roomsSlider',
  title: 'Zdjęcia pokoi',
  type: 'document',
  fields: [
    defineField({
      name: 'images',
      title: 'Zdjęcia pokoi',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'roomImage',
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
              title: 'Opis zdjęcia',
              type: 'string',
              initialValue: 'Pokój w Willi Ewa',
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
      return {title: 'Slider pokoi'}
    },
  },
})
