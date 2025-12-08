import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/dashboard/Dashboard';
import { POS } from './pages/pos/POS';
import { ProductList } from './pages/products/ProductList';
import { SalesHistory } from './pages/sales/SalesHistory';
import { ReceiptView } from './pages/sales/ReceiptView';
import { UserList } from './pages/admin/UserList';
import { Settings } from './pages/settings/Settings';
import { SupplierList } from './pages/suppliers/SupplierList';
import { PurchaseOrderList } from './pages/purchase-orders/PurchaseOrderList';
import { PurchaseOrderForm } from './pages/purchase-orders/PurchaseOrderForm';
import { PurchaseOrderView } from './pages/purchase-orders/PurchaseOrderView';
import { Reports } from './pages/reports/Reports';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/sales" element={<SalesHistory />} />
            <Route path="/sales/:id" element={<ReceiptView />} />
            <Route path="/suppliers" element={<SupplierList />} />
            <Route path="/purchase-orders" element={<PurchaseOrderList />} />
            <Route path="/purchase-orders/new" element={<PurchaseOrderForm />} />
            <Route path="/purchase-orders/:id" element={<PurchaseOrderView />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
