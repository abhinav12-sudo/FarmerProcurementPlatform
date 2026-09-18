import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Pages/Landing.jsx'
import FarmerLogin from './Pages/farmer/FarmerLogin.jsx'
import StaffLogin from './Pages/staff/StaffLogin.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path = "/farmer" element = {<FarmerLogin/>}/>
        <Route path = "/staff" element = {<StaffLogin/>}/>




      </Routes>
    </BrowserRouter>
  )
}

export default App
