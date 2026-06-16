import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from "../context/AuthContext";

const API_URL = "/api";

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/stats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Błąd podczas pobierania statystyk");
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (loading && !stats) return <div className="loading">Loading stats...</div>;
  if (!stats) return <div className="loading">Error loading stats.</div>;

  return (
    <div className="page-container">
      <h2>Statystyki Systemu</h2>
      <button className="primary-btn" onClick={fetchStats} disabled={loading}>
        {loading ? "Odświeżanie..." : "Odśwież Statystyki"}
      </button>
      <ul className="stats-list">
        <li><strong>Całkowita liczba eventów:</strong> {stats.totalEvents}</li>
        <li><strong>ID instancji backendu:</strong> {stats.backendInstanceId}</li>
        <li><strong>Liczba ogólnie obsłużonych żądań:</strong> {stats.totalRequests}</li>
      </ul>
    </div>
  );
}
