import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AuthGate } from '@/auth/AuthGate'
import { AppShell } from '@/components/AppShell'
import { ApprovalsPage } from '@/pages/ApprovalsPage'
import { BalanceAdjustmentsPage } from '@/pages/BalanceAdjustmentsPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { MyRequestsPage } from '@/pages/MyRequestsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RequestLeavePage } from '@/pages/RequestLeavePage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { AdminUserDetailsPage } from '@/pages/admin/AdminUserDetailsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGate />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/request" element={<RequestLeavePage />} />
            <Route path="/my-requests" element={<MyRequestsPage />} />
            <Route path="/my-balances" element={<BalanceAdjustmentsPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/user/:userId" element={<AdminUserDetailsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
