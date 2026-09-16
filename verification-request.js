import { getToken } from '@vercel/connect'

const CONNECTOR_UID = 'api.twilio.com/support-center-phone-verification'
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID

function json(res, status, body) {
  res.status(status).json(body)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  if (!ACCOUNT_SID || !VERIFY_SERVICE_SID) return json(res, 503, { error: 'Phone verification is not configured.' })

  const { phone, name = '', email = '', country = '' } = req.body || {}
  if (!/^\+[1-9]\d{7,14}$/.test(String(phone || ''))) {
    return json(res, 400, { error: 'Enter a valid international phone number.' })
  }

  try {
    const token = await getToken(CONNECTOR_UID, { subject: { type: 'app' }, scopes: ['*'] })
    const body = new URLSearchParams({
      To: phone,
      Channel: 'sms',
    })
    const response = await fetch(`https://verify.twilio.com/v2/Services/${encodeURIComponent(VERIFY_SERVICE_SID)}/Verifications`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${ACCOUNT_SID}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!response.ok) {
      const details = await response.text()
      console.error('[v0] Twilio verification request failed', response.status, details)
      let twilioMessage = ''
      try {
        const parsed = JSON.parse(details)
        twilioMessage = typeof parsed.message === 'string' ? parsed.message : ''
      } catch {}
      return json(res, response.status === 429 ? 429 : 502, {
        error: twilioMessage || 'Twilio could not send the verification code.',
      })
    }

    return json(res, 200, { ok: true, phone, name, email, country, status: 'pending' })
  } catch (error) {
    console.error('[v0] Phone verification route failed', error)
    return json(res, 502, { error: 'Unable to start phone verification right now.' })
  }
}
