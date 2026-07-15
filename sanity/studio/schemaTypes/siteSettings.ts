import {defineField, defineType} from 'sanity'

export const siteSettingsType = defineType({
  name: 'siteSettings',
  title: 'Ustawienia strony',
  type: 'document',
  fields: [
    defineField({
      name: 'roomsDescription',
      title: 'Opis pokoi',
      type: 'text',
      rows: 5,

    }),
    defineField({
      name: 'priceFrom',
      title: 'Cena od (zł)',
      type: 'number',

    }),
    defineField({
      name: 'priceTo',
      title: 'Cena do (zł)',
      type: 'number',

    }),
    defineField({
      name: 'contactEmail',
      title: 'E-mail kontaktowy',
      type: 'string',

    }),
    defineField({
      name: 'contactPhone',
      title: 'Telefon kontaktowy',
      type: 'string',

    }),
    defineField({
      name: 'address',
      title: 'Adres',
      type: 'string',

    }),
  ],
  preview: {
    prepare() {
      return {title: 'Ustawienia strony'}
    },
  },
})
