import { describe, expect, it } from 'vitest'
import { containsLink, validateInquiry, validateReview } from '../functions/_shared/validation'

describe('containsLink', () => {
  it.each([
    'Zapraszam na http://spam.pl',
    'https://example.com/promo',
  ])('finds a link in "%s"', (text) => {
    expect(containsLink(text)).toBe(true)
  })

  it.each([
    'Czysto, cicho, blisko plaży. Polecam!',
    'Czysto.Polecam wszystkim',
    'Super pobyt,np. spacer na plażę 5 min',
    'Wrócimy za rok.Plaża blisko',
    'Ok. 100 zł za noc',
  ])('lets "%s" through', (text) => {
    expect(containsLink(text)).toBe(false)
  })
})

describe('validateReview', () => {
  const valid = { author: 'Anna', content: 'Bardzo miło, wrócimy!', rating: 5 }

  it('accepts a correct review and trims the text', () => {
    const result = validateReview({ ...valid, author: '  Anna  ', email: '' })
    expect(result).toEqual({
      ok: true,
      data: { author: 'Anna', content: 'Bardzo miło, wrócimy!', rating: 5, email: undefined },
    })
  })

  it.each([
    ['too short author', { author: 'A' }],
    ['too long author', { author: 'A'.repeat(101) }],
    ['missing content', { content: undefined }],
    ['too long content', { content: 'a'.repeat(1001) }],
    ['rating outside the list', { rating: 4.2 }],
    ['rating above 5', { rating: 6 }],
    ['rating sent as text', { rating: '5' }],
  ])('rejects %s', (_, change) => {
    expect(validateReview({ ...valid, ...change }).ok).toBe(false)
  })
})

describe('validateInquiry', () => {
  const valid = {
    name: 'Jan Kowalski',
    email: 'jan@example.com',
    phone: '+48 600 100 200',
    dateFrom: '2027-07-01',
    dateTo: '2027-07-08',
    adults: 2,
  }

  it('accepts a correct inquiry', () => {
    expect(validateInquiry(valid).ok).toBe(true)
  })

  it.each([
    ['e-mail without a domain', { email: 'jan@' }],
    ['phone with letters', { phone: '600 abc 200' }],
    ['end date before start date', { dateFrom: '2027-07-08', dateTo: '2027-07-01' }],
    ['the same start and end date', { dateTo: '2027-07-01' }],
    ['a date that is not a date', { dateFrom: 'jutro' }],
    ['zero adults', { adults: 0 }],
    ['half an adult', { adults: 1.5 }],
    ['children ages with letters', { childrenAges: '5, dziesięć' }],
  ])('rejects %s', (_, change) => {
    expect(validateInquiry({ ...valid, ...change }).ok).toBe(false)
  })
})
