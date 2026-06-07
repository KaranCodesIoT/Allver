import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Register from './Register';
import Login from './Login';
import ClientProfileSetup from './ClientProfileSetup';
import ArchitectProfileSetup from './ArchitectProfileSetup';
import ContractorProfileSetup from './ContractorProfileSetup';
import LabourProfileSetup from './LabourProfileSetup';
import ArchitectsPage from './ArchitectsPage';
import ContractorsPage from './ContractorsPage';
import LabourPage from './LabourPage';
import ArchitectProfilePage from './ArchitectProfilePage';
import EditProfilePage from './EditProfilePage';
import ProjectDetailsPage from './ProjectDetailsPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile-setup/client" element={<ClientProfileSetup />} />
        <Route path="/profile-setup/architect" element={<ArchitectProfileSetup />} />
        <Route path="/profile-setup/contractor" element={<ContractorProfileSetup />} />
        <Route path="/profile-setup/labour" element={<LabourProfileSetup />} />
        <Route path="/architects" element={<ArchitectsPage />} />
        <Route path="/contractors" element={<ContractorsPage />} />
        <Route path="/labour" element={<LabourPage />} />
        <Route path="/architect/:id" element={<ArchitectProfilePage />} />
        <Route path="/profile" element={<ArchitectProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/project/:id" element={<ProjectDetailsPage />} />
      </Routes>
    </Router>
  );
};

export default App;
