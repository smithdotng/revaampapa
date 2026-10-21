import { sendInquiry } from '@/app/(site)/properties/[slug]/actions'
import { bodyAsFormData, fromState } from '../_json'

/** JSON version of the property enquiry form (kept for the old site's scripts and any integrations). */
export async function POST(req: Request) {
  const fd = await bodyAsFormData(req)
  if (!fd.get('propertyId') && fd.get('property')) fd.set('propertyId', String(fd.get('property')))
  return fromState(await sendInquiry({}, fd))
}
