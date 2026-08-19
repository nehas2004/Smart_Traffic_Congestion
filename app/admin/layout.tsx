import { AdminNav } from '@/components/admin/admin-nav'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2c2825] font-sans antialiased">
      <AdminNav />
      {children}
    </div>
  )
}
