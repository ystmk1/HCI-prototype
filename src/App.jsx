import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ExperimentProvider } from './context/ExperimentContext'
import VehicleHMI from './components/VehicleHMI'
import OperatorConsole from './components/OperatorConsole'

function App() {
  return (
    <BrowserRouter>
      <ExperimentProvider>
        <Routes>
          <Route path="/hmi"      element={<VehicleHMI />} />
          <Route path="/operator" element={<OperatorConsole />} />
          <Route path="*"         element={<Navigate to="/hmi" replace />} />
        </Routes>
      </ExperimentProvider>
    </BrowserRouter>
  )
}

export default App
