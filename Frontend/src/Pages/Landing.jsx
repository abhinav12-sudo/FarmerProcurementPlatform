import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  function chooseRole(role) {
    localStorage.setItem('userRole', role)   
    if (role === 'farmer') {
      navigate('/farmer')
    } else {
      navigate('/staff/login')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '24px'
    }}>
      <h1 style={{ marginBottom: '8px' }}>Kisan Mandi</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>Who are you?</p>

      <button onClick={() => chooseRole('farmer')} style={cardStyle('#e6f7f0')}>
        <span style={{ fontSize: '40px' }}>🌾</span>
        <strong>Farmer</strong>
        <span style={{ fontSize: '13px', color: '#555' }}>Book slots, track payment</span>
      </button>

      <button onClick={() => chooseRole('staff')} style={cardStyle('#e6f0fb')}>
        <span style={{ fontSize: '40px' }}>🏛️</span>
        <strong>Staff / Officer</strong>
        <span style={{ fontSize: '13px', color: '#555' }}>Check in, record produce</span>
      </button>
    </div>
  )
}

const cardStyle = (bg) => ({
  background: bg,
  border: 'none',
  borderRadius: '16px',
  padding: '24px 32px',
  width: '100%',
  maxWidth: '320px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  fontSize: '18px',
})