import { useContext } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Callback } from "./pages/Callback";
import Home from "./pages/Home";
import Events from "./pages/Events";
import Stats from "./pages/Stats";
import "./App.css";

function AppContent() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="App">
      {user && (
        <header className="App-header">
          <h1>Event Manager</h1>
          <nav className="nav-bar">
            <Link to="/">Strona główna</Link>
            <Link to="/events">Wydarzenia</Link>
            <Link to="/stats">Statystyki</Link>
          </nav>
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", alignItems: "center", gap: "15px" }}>
            <span style={{ background: "rgba(255,255,255,0.1)", padding: "8px 16px", borderRadius: "20px", fontSize: "0.9rem" }}>
              👤 {user.username}
            </span>
            <button className="primary-btn" onClick={logout} style={{ padding: "8px 20px", fontSize: "0.9rem" }}>Wyloguj</button>
          </div>
        </header>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Events />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stats"
          element={
            <ProtectedRoute>
              <Stats />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
