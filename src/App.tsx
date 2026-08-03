import { Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import Home from './components/Home'
import Login from './pages/Login'
import AuthAndProfile from './pages/AuthAndProfile'
import Search from './pages/Search'
import Detail from './pages/Detail'
import Cart from './pages/Cart'
import MyPage from './pages/MyPage'
import Orders from './pages/Orders'
import OrderManagement from './pages/OrderManagement'
import ShippingManagement from './pages/ShippingManagement'
import SettlementManagement from './pages/SettlementManagement'
import ProductManagement from './pages/ProductManagement'
import ProductRegistration from './pages/ProductRegistration'
import Notice from './pages/Notice'

function App() {
  return (
    <div className="app-shell">
      <Header />

      <main className="app-main">
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<AuthAndProfile />} />
            <Route path="/search" element={<Search />} />
            <Route path="/product/:id" element={<Detail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/seller/orders" element={<OrderManagement />} />
            <Route path="/seller/shipping" element={<ShippingManagement />} />
            <Route path="/seller/settlement" element={<SettlementManagement />} />
            <Route path="/manage" element={<ProductManagement />} />
            <Route path="/register" element={<ProductRegistration />} />
            <Route path="/notice" element={<Notice />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
