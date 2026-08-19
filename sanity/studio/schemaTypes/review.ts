import { defineType, defineField } from 'sanity'

export const reviewType = defineType({
  name: 'review',
  title: 'Opinie',
  type: 'document',
  fields: [
    defineField({ name: 'author', type: 'string', title: 'Autor' }),
    defineField({ name: 'quote', type: 'text', title: 'Treść' }),
    defineField({ name: 'rating', type: 'number', title: 'Ocena' }),
    defineField({ name: 'source', type: 'string', title: 'Źródło' }),         // 'page' | 'google'
    defineField({ name: 'status', type: 'string', title: 'Status' }),         // 'pending' | 'accepted' | 'deleted'
    defineField({ name: 'googleReviewId', type: 'string', title: 'Google Review ID' }),
    defineField({ name: 'email', type: 'string', title: 'E-mail' }),
    defineField({ name: 'time', type: 'number', title: 'Czas (Unix timestamp)' }),
    defineField({ name: 'createdAt', type: 'number', title: 'Data dodania (Unix timestamp)' }),
    defineField({ name: 'reply', type: 'text', title: 'Odpowiedź właścicielki' }),
    defineField({ name: 'replyTime', type: 'number', title: 'Data odpowiedzi (Unix timestamp)' }),
  ],
  preview: {
    select: {
      title: 'author',
      subtitle: 'status',
    },
  },
})
