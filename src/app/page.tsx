import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    if (session.user.role === 'TRANSPORTEUR') redirect('/transporteur')
    else redirect('/commissionnaire')
  }

  redirect('/login')
}
