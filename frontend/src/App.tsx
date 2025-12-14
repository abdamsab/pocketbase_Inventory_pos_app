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
import { CategoryList } from './pages/admin/CategoryList';
import { LocationList } from './pages/admin/LocationList';
// import { AuditLog } from './pages/admin/AuditLog';
import { Settings } from './pages/settings/Settings';
import { SupplierList } from './pages/suppliers/SupplierList';
import { PurchaseOrderList } from './pages/purchase-orders/PurchaseOrderList';
import { PurchaseOrderForm } from './pages/purchase-orders/PurchaseOrderForm';
import { PurchaseOrderView } from './pages/purchase-orders/PurchaseOrderView';
import { Reports } from './pages/reports/Reports';
import { AdvancedAnalytics } from './pages/reports/AdvancedAnalytics';
import { InventoryEntriesList } from './pages/inventory/InventoryEntriesList';
import { SalesItemsList } from './pages/sales/SalesItemsList';

console.log('🎯 App.tsx: App component rendering...');

function App() {
  console.log('🛣️ App.tsx: Setting up router...');
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
            <Route path="/reports/advanced-analytics" element={<AdvancedAnalytics />} />
            <Route path="/inventory-entries" element={<InventoryEntriesList />} />
            <Route path="/sales-items" element={<SalesItemsList />} />
            <Route path="/categories" element={<CategoryList />} />
            <Route path="/locations" element={<LocationList />} />
            <Route path="/users" element={<UserList />} />
            {/* <Route path="/audit-logs" element={<AuditLog />} /> */}
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
