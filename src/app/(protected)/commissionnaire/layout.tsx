import { exigerRoleOuRediriger } from '@/lib/garde'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigerRoleOuRediriger('COMMISSIONNAIRE')
  return <>{children}</>
}
