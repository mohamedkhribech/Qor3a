import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CreateJamiya from './pages/CreateJamiya';
import AddMembers from './pages/AddMembers';
import GenerateDraw from './pages/GenerateDraw';
import Results from './pages/Results';
import Verify from './pages/Verify';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Routes>
          <Route path="/" element={<CreateJamiya />} />
          <Route path="/create" element={<CreateJamiya />} />
          <Route path="/add-members" element={<AddMembers />} />
          <Route path="/generate" element={<GenerateDraw />} />
          <Route path="/results" element={<Results />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
