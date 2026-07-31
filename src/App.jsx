import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoanApp from './pages/LoanApp.jsx';
import Login from './pages/Login.jsx';
import Status from './pages/Status.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/:userId"                    element={<LoanApp />} />
        <Route path="/:userId/check-rate"         element={<LoanApp />} />
        <Route path="/:userId/loan-application"   element={<LoanApp />} />
        <Route path="/:userId/details"            element={<LoanApp />} />
        <Route path="/:userId/summary"            element={<LoanApp />} />
        <Route path="/:userId/login"              element={<Login />} />
        <Route path="/:userId/status"             element={<Status />} />
        <Route path="*"                           element={<LoanApp />} />
      </Routes>
    </Router>
  );
}

export default App;
