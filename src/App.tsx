import { Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import Home from './components/Home'
import Login from './pages/Login'
import AuthAndProfile from './pages/AuthAndProfile'
import Search from './pages/Search'
import Detail from './pages/Detail'
import MyPage from './pages/MyPage'
import Orders from './pages/Orders'
import OrderManagement from './pages/OrderManagement'
import ShippingManagement from './pages/ShippingManagement'
import ProductManagement from './pages/ProductManagement'
import ProductRegistration from './pages/ProductRegistration'

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
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/seller/orders" element={<OrderManagement />} />
            <Route path="/seller/shipping" element={<ShippingManagement />} />
            <Route path="/manage" element={<ProductManagement />} />
            <Route path="/register" element={<ProductRegistration />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
