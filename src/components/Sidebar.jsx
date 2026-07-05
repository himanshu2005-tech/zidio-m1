import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <svg width="28" height="28" viewBox="0 0 256 256" fill="var(--accent)"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200Zm-88-88H80V80a8,8,0,0,1,16,0v24h32a8,8,0,0,1,0,16Z"></path></svg>
        <span>Zidio Meet</span>
      </div>

      <div className="sidebar-links">
        <NavLink to="/dashboard/home" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M152,208V160a8,8,0,0,0-8-8H112a8,8,0,0,0-8,8v48a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V115.54a8,8,0,0,1,2.62-5.92l80-72.54a8,8,0,0,1,10.76,0l80,72.54a8,8,0,0,1,2.62,5.92V208a8,8,0,0,1-8,8H160A8,8,0,0,1,152,208Z"></path></svg>
          Home
        </NavLink>
        <NavLink to="/dashboard/records" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,88Zm0,48a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,136Zm0,48a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,184Z"></path></svg>
          Meeting Records
        </NavLink>
        <NavLink to="/dashboard/settings" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.61a89.21,89.21,0,0,0-14.61-25.3l11.87-20.57a8,8,0,0,0-1.44-7.83A107.71,107.71,0,0,0,167,4.32a8,8,0,0,0-7.05,1.48L141.34,20.73a89,89,0,0,0-26.68,0L96.06,5.8A8,8,0,0,0,89,4.32,107.71,107.71,0,0,0,68.42,13.65a8,8,0,0,0-1.44,7.83l11.87,20.57a89.21,89.21,0,0,0-14.61,25.3L40.52,69.96a8,8,0,0,0-6,3.93A107.21,107.21,0,0,0,23.6,100.14a8,8,0,0,0,1.48,7.06L40,125.84q-.06,2.16,0,4.32L25.08,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.61a89.21,89.21,0,0,0,14.61,25.3l-11.87,20.57a8,8,0,0,0,1.44,7.83A107.71,107.71,0,0,0,89,251.68a8,8,0,0,0,7.05-1.48l18.62-14.93a89,89,0,0,0,26.68,0l18.62,14.93a8,8,0,0,0,7.05,1.48,107.71,107.71,0,0,0,20.58-9.33,8,8,0,0,0,1.44-7.83l-11.87-20.57a89.21,89.21,0,0,0,14.61-25.3l23.72-2.61a8,8,0,0,0,6-3.93,107.21,107.21,0,0,0,10.88-26.25,8,8,0,0,0-1.48-7.06ZM128,192a64,64,0,1,1,64-64A64.07,64.07,0,0,1,128,192Z"></path></svg>
          Settings
        </NavLink>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <img src={user?.photoURL || 'https://www.gravatar.com/avatar/0?d=mp'} alt="Profile" className="avatar" />
          <div className="user-info">
            <span className="user-name">{user?.displayName || 'User'}</span>
            <span className="user-email">{user?.email}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={signOut}>
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M112,216a8,8,0,0,1-8,8H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h56a8,8,0,0,1,0,16H48V208h56A8,8,0,0,1,112,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L196.69,120H104a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,221.66,122.34Z"></path></svg>
          Sign out
        </button>
      </div>
    </nav>
  );
}
