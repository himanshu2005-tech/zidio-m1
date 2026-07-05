import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from 'firebase/auth';

export default function Settings() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    setMessage('');
    try {
      await updateProfile(user, { displayName });
      setMessage('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      setMessage('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="home-screen fade-in">
      <div className="home-header">
        <h1>Settings</h1>
        <p>Manage your account preferences and profile.</p>
      </div>

      <div className="home-card" style={{ maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '24px' }}>Profile Settings</h2>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="setting-group">
            <label>Email Address</label>
            <input 
              type="text" 
              className="settings-input" 
              value={user?.email || ''} 
              disabled 
              style={{ opacity: 0.7 }}
            />
          </div>

          <div className="setting-group">
            <label>Display Name</label>
            <input 
              type="text" 
              className="settings-input" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <button type="submit" className="primary-btn" disabled={isSaving} style={{ marginTop: '8px' }}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>

          {message && (
            <p style={{ color: message.includes('Failed') ? '#ff3b30' : '#34C759', fontSize: '13px', textAlign: 'center' }}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
