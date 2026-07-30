import { Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import Home from './components/Home'
import Login from './pages/Login'
import Search from './pages/Search'
import Detail from './pages/Detail'
import MyPage from './pages/MyPage'
import Orders from './pages/Orders'
import SettlementManagement from './pages/SettlementManagement'

function App() {
  return (
    <div className="app-shell">
      <Header />

      <main className="app-main">
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/search" element={<Search />} />
            <Route path="/product/:id" element={<Detail />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/seller/settlement" element={<SettlementManagement />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
