import React, { useState } from 'react';

function UserPanel({ currentUser, onUpdateProfile }) {
  const [username, setUsername] = useState(currentUser.username);
  const [color, setColor] = useState(currentUser.color);

  const handleUpdate = () => {
    onUpdateProfile(username, color);
  };

  return (
    <div className="user-info">
      <div className="input-group">
        <label htmlFor="username">Username</label>
        <input 
          type="text" 
          id="username" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username" 
        />
      </div>
      <div className="input-group">
        <label htmlFor="userColor">Drawing Color</label>
        <div className="color-picker">
          <div 
            className="color-preview" 
            style={{ backgroundColor: color }}
          ></div>
          <input 
            type="color" 
            id="userColor" 
            className="color-input" 
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
      </div>
      <button className="button" onClick={handleUpdate}>
        Update Profile
      </button>
    </div>
  );
}

export default UserPanel;
