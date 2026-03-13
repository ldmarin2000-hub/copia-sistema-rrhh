import Header from './components/Header'
import Sidebar from './components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#0d1117' }}>
      <Header />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{
          flex: 1,
          padding: '24px',
          maxWidth: '1280px',
          color: '#e6edf3',
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}