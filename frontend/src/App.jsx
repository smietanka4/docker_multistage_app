import React, { useState, useEffect } from "react";
import "./App.css";

const API_URL = "/api";

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/events`);

      if (!response.ok) {
        throw new Error(`Błąd HTTP! status: ${response.status}`);
      }

      const data = await response.json();

      setEvents(data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching events: ", err);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading events...</div>;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Event Calendar</h1>
      </header>
      <main className="event-list">
        {events.length === 0 ? (
          <p className="no-events">Brak zaplanowanych wydarzeń</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="event-block">
              <div className="event-date">
                {newDate(event.date).toLocaleDateString("pl-PL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="event-content">
                <h3>{event.title}</h3>
                <p>{event.description}</p>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}

export default App;
