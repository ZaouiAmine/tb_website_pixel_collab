import React from 'react';

function UsersList({ users }) {
  return (
    <div className="users-list">
      {users && users.length > 0 ? (
        users.map(user => (
          <div key={user.id} className="user-item">
            <div 
              className="user-color" 
              style={{ backgroundColor: user.color || '#999' }}
            ></div>
            <span className="user-name">{user.username || 'Unknown'}</span>
            <span className="user-status">
              {user.online ? 'Online' : 'Offline'}
            </span>
          </div>
        ))
      ) : (
        <div className="user-item">No users online</div>
      )}
    </div>
  );
}

export default UsersList;
