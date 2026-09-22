import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext.jsx'
import Landing from './Pages/Landing.jsx'
import FarmerLogin from './Pages/farmer/FarmerLogin.jsx'
import FarmerHome from './Pages/farmer/FarmerHome.jsx'
import StaffLogin from './Pages/staff/StaffLogin.jsx'
import StaffHome from './Pages/staff/StaffHome.jsx'

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/farmer/login" element={<FarmerLogin />} />
          <Route path="/farmer/home" element={<FarmerHome />} />
          <Route path="/farmer" element={<FarmerHome />} />
          <Route path="/staff" element={<StaffLogin />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/staff/home" element={<StaffHome />} />
          <Route path="/staff/dashboard" element={<StaffHome />} />
        </Routes>
      </LanguageProvider>
    </BrowserRouter>
  )
}


export default App
