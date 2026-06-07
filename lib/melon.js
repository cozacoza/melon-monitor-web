const BASE = 'https://tktapi.melon.com/api/product/schedule'

const PARAMS = {
  pocCode: 'SC0002',
  perfTypeCode: 'GN0002',
  sellTypeCode: 'ST0001',
  seatCntDisplayYn: 'N',
  interlockTypeCode: 'IL0002',
  corpCodeNo: '',
  reflashYn: 'N',
  requestservicetype: 'P',
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': 'https://ticket.melon.com/',
  'X-Requested-With': 'XMLHttpRequest',
}

function qs(params) {
  return new URLSearchParams({ ...PARAMS, ...params }).toString()
}

async function melonFetch(path, params) {
  const res = await fetch(`${BASE}/${path}?${qs(params)}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`Melon API error: ${res.status}`)
  const json = await res.json()
  return json.data || {}
}

export function extractProdId(url) {
  const m = url.match(/prodId=(\d+)/)
  return m ? m[1] : null
}

export async function getDaylist(prodId) {
  const data = await melonFetch('daylist.json', { prodId })
  return data.perfDaylist || []
}

export async function getTimelist(prodId, perfDay) {
  const data = await melonFetch('timelist.json', { prodId, perfDay })
  return data.perfTimelist || []
}

export async function getGradelist(prodId, perfDay, scheduleNo) {
  const data = await melonFetch('gradelist.json', {
    prodId, perfDay,
    scheduleNoArray: scheduleNo,
    seatPoc: '1',
    cancelCloseDt: '',
  })
  return data.seatGradelist || []
}

export async function getConcertInfo(prodId) {
  try {
    const res = await fetch(
      `https://ticket.melon.com/performance/index.htm?prodId=${prodId}`,
      { headers: { ...HEADERS, Accept: 'text/html' } }
    )
    const html = await res.text()
    const m = html.match(/<title>([^<]+)<\/title>/)
    if (m) {
      return m[1].replace(/\s*[-|]\s*멜론티켓.*$/i, '').trim()
    }
  } catch {}
  return `공연 ${prodId}`
}
