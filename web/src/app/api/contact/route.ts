import { sendContact } from '@/app/(site)/contact/actions'
import { bodyAsFormData, fromState } from '../_json'

export async function POST(req: Request) {
  return fromState(await sendContact({}, await bodyAsFormData(req)))
}
