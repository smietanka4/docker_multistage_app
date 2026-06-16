import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const API_URL = "/api";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useContext(AuthContext);
  
  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/events`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !date) return;
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_URL}/events`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title, description, date })
      });
      if (response.ok) {
        setTitle("");
        setDescription("");
        setDate("");
        await fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Na pewno usunąć?")) return;
    try {
      const response = await fetch(`${API_URL}/events/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        await fetchEvents();
      } else {
        const errorData = await response.json();
        alert(`Błąd usuwania: ${errorData.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Wystąpił błąd sieci");
    }
  };

  if (loading) return <div className="loading">Loading events...</div>;

  return (
    <div className="events-container">
      <form onSubmit={handleSubmit} className="event-form">
        <h3>Dodaj Wydarzenie</h3>
        <input 
          type="text" 
          placeholder="Tytuł" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          required 
        />
        <input 
          type="text" 
          placeholder="Opis" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          required 
        />
        <input 
          type="datetime-local" 
          value={date} 
          min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16)}
          onChange={(e) => setDate(e.target.value)} 
          required 
        />
        <button type="submit" disabled={isSubmitting} className="primary-btn">
          {isSubmitting ? "Dodawanie..." : "Dodaj"}
        </button>
      </form>

      <main className="event-list">
        {events.length === 0 ? (
          <p className="no-events">Brak zaplanowanych wydarzeń</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="event-block">
              <div className="event-date">
                {new Date(event.date).toLocaleString("pl-PL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </div>
              <div className="event-content">
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                {user?.roles?.includes("admin") && (
                  <button 
                    onClick={() => handleDelete(event.id)}
                    style={{ marginTop: "15px", background: "#ef4444", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}
                  >
                    🗑 Usuń (Tylko Admin)
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
