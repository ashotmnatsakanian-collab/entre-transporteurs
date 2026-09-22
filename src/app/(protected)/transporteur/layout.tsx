import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function TransporteurLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'TRANSPORTEUR') redirect('/commissionnaire')
  return <>{children}</>
}
