import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { AuthGuard }   from '@/components/layout/AuthGuard'
import { AppLayout }   from '@/components/layout/AppLayout'
import { Login }       from '@/pages/auth/Login'
import { Register }    from '@/pages/auth/Register'
import { lazy, Suspense } from 'react'

const Dashboard  = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Kanban     = lazy(() => import('@/pages/Kanban').then(m => ({ default: m.Kanban })))
const LeadDetail = lazy(() => import('@/pages/LeadDetail').then(m => ({ default: m.LeadDetail })))
const Campaigns  = lazy(() => import('@/pages/Campaigns').then(m => ({ default: m.Campaigns })))
const Pipeline   = lazy(() => import('@/pages/Pipeline').then(m => ({ default: m.Pipeline })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<AuthGuard />}>
              <Route element={<AppLayout />}>
                <Route index                element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard"     element={<Dashboard />} />
                <Route path="kanban"        element={<Kanban />} />
                <Route path="leads/:id"     element={<LeadDetail />} />
                <Route path="campaigns"     element={<Campaigns />} />
                <Route path="pipeline"      element={<Pipeline />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
