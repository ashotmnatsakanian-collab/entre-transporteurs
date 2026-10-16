import { exigerRoleOuRediriger } from '@/lib/garde'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigerRoleOuRediriger('ADMIN')
  return <>{children}</>
}
