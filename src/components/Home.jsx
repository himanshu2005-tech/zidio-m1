import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [channelName, setChannelName] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleJoin = (e) => {
    e.preventDefault();
    if (channelName.trim()) {
      navigate(`/call/${channelName.trim()}`);
    }
  };

  const generateRandomRoom = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 9; i++) {
      if (i > 0 && i % 3 === 0) id += '-';
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setChannelName(id);
  };

  return (
    <div className="home-screen">
      <div className="home-header">
        <h1>Welcome, {user?.displayName.split(' ')[0]}!</h1>
        <p>Start a new meeting or join an existing one.</p>
      </div>

      <div className="home-cards">
        <div className="home-card premium-card">
          <div className="card-icon new-meeting-icon">
            <svg width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,88Zm0,48a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,136Zm0,48a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,184Z"></path></svg>
          </div>
          <h2>Create Meeting</h2>
          <p>Generate a secure, random meeting link.</p>
          <button className="primary-btn" onClick={generateRandomRoom}>Generate Code</button>
        </div>

        <div className="home-card join-card">
          <h2>Join Meeting</h2>
          <p>Enter a meeting code or link to join.</p>
          <form onSubmit={handleJoin} className="join-form">
            <input
              type="text"
              placeholder="e.g. abc-def-ghi"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
            />
            <button type="submit" className="primary-btn">Join</button>
          </form>
        </div>
      </div>
    </div>
  );
}
