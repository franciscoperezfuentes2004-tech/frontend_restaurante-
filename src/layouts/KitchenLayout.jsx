import { Outlet } from 'react-router-dom'

export default function KitchenLayout() {
  return (
    <div className="min-h-screen bg-theme-bg text-theme-text flex flex-col">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
