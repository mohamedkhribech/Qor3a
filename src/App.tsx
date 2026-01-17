import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CreateJamiya from './pages/CreateJamiya';
import AddMembers from './pages/AddMembers';
import GenerateDraw from './pages/GenerateDraw';
import Results from './pages/Results';

import { SpeedInsights } from "@vercel/speed-insights/react";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <SpeedInsights />
        <Routes>
          <Route path="/" element={<CreateJamiya />} />
          <Route path="/create" element={<CreateJamiya />} />
          <Route path="/add-members" element={<AddMembers />} />
          <Route path="/generate" element={<GenerateDraw />} />
          <Route path="/results" element={<Results />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
