import { describe, expect, it } from 'vitest'
import { paginateEmailUids } from './email-summary'

describe('paginateEmailUids', () => {
  it('returns newest messages first and a cursor for the remaining history', () => {
    expect(paginateEmailUids([101, 102, 103, 104, 105], 2)).toEqual({
      selected: [105, 104],
      hasMore: true,
      nextCursor: '104',
    })
  })

  it('continues before the cursor without duplicating the previous page', () => {
    expect(paginateEmailUids([101, 102, 103, 104, 105], 2, '104')).toEqual({
      selected: [103, 102],
      hasMore: true,
      nextCursor: '102',
    })
  })
})
