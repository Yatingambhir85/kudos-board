import React, { useState, useEffect, useCallback } from 'react';
import './index.css'; 

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [cards, setCards] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ to: '', from: '', headline: '', message: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Fetch cards
  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/api/kudos`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to load recognition board');
      
      const result = await response.json();
      const cardsList = Array.isArray(result?.data) ? result.data : (Array.isArray(result) ? result : []);
      setCards(cardsList.filter(card => card && (card.to || card.from || card.message)));
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Could not connect to backend service');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === 'message' && value.length > 500) return;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.to?.trim() || !formData.from?.trim() || !formData.message?.trim()) {
      setError('All fields are required');
      return;
    }
    if (formData.message.length > 500) {
      setError('Message cannot exceed 500 characters');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/api/kudos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send kudos card');
      }
      
      const newCard = await response.json();
      setCards(prev => [newCard, ...prev]);
      setFormData({ to: '', from: '', headline: '', message: '' });
      setSuccessMessage('✨ Kudos sent successfully!');
      
      setTimeout(() => setSuccessMessage(null), 3000);

      if (window.confetti) {
        window.confetti({
          particleCount: 120,
          spread: 60,
          origin: { y: 0.75 }
        });
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to send kudos card');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recognition card?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/kudos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete the card');
      
      setCards(prev => prev.filter(card => card._id !== id));
      setSuccessMessage('Card deleted');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete');
    }
  };

  const filteredCards = cards.filter(card => {
    const search = searchQuery.toLowerCase();
    return (
      (card?.to?.toLowerCase() || '').includes(search) ||
      (card?.from?.toLowerCase() || '').includes(search)
    );
  });

  return (
    <div className="app-container">
      <header className="header">
        <h1>✨ KudosBoard ✨</h1>
        <p style={{ color: 'var(--text-muted)' }}>Share instant recognition with your teammates</p>
      </header>

      <div className="search-container">
        <input 
          type="text" 
          className="search-input"
          placeholder="🔍 Search recognition by name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="main-layout">
        <form className="form-card" onSubmit={handleSubmit}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Give Recognition</h3>
          
          {error && <div style={{ color: '#ef4444', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#ffe0e0', borderRadius: '4px' }}>⚠️ {error}</div>}
          {successMessage && <div style={{ color: '#22c55e', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#e0ffe0', borderRadius: '4px' }}>✅ {successMessage}</div>}
          
          <div className="form-group">
            <label>To (Name) *</label>
            <input type="text" name="to" value={formData.to} onChange={handleChange} required placeholder="e.g., Sarah Jenkins" maxLength="100" />
          </div>

          <div className="form-group">
            <label>From (Your Name) *</label>
            <input type="text" name="from" value={formData.from} onChange={handleChange} required placeholder="e.g., Alex Rivera" maxLength="100" />
          </div>

          <div className="form-group">
            <label>Headline</label>
            <input type="text" name="headline" value={formData.headline} onChange={handleChange} placeholder="e.g., Incredible Clutch Save!" maxLength="200" />
          </div>

          <div className="form-group">
            <label>Message *</label>
            <textarea name="message" rows="4" value={formData.message} onChange={handleChange} required placeholder="Explain how they went above and beyond..." maxLength="500"></textarea>
            <div className="char-counter">{formData.message.length} / 500</div>
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Sending...' : 'Publish to Board 🚀'}
          </button>
        </form>

        <div className="board-grid">
          {loading && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>⏳ Loading recognition board...</div>}
          
          {!loading && filteredCards.length > 0 ? (
            filteredCards.map((card) => (
              <div className="kudos-card" key={card._id} style={{ position: 'relative' }}>
                <button 
                  onClick={() => handleDelete(card._id)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    opacity: 0.6,
                    transition: 'opacity 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(1)'; }}
                  title="Delete Kudos Card"
                  aria-label="Delete card"
                >
                  🗑️
                </button>

                <div style={{ paddingRight: '24px' }}>
                  <div className="card-header">To: {card.to || 'Anonymous'}</div>
                  {card.headline && <div className="card-headline">{card.headline}</div>}
                  <div className="card-message">"{card.message || '...'}"</div>
                </div>
                <div className="card-footer">
                  <span>From: <strong>{card.from || 'Anonymous'}</strong></span>
                  <span>{card.createdAt ? new Date(card.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                </div>
              </div>
            ))
          ) : (
            !loading && <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <h3>The board is clean.</h3>
              <p>Be the first to leave a word of appreciation above or adjust your search filter!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
