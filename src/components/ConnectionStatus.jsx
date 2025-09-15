import React from 'react';

function ConnectionStatus({ status, onConnect }) {
  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="status-indicator">
      <div className={`status-dot ${status === 'connected' ? 'connected' : ''}`}></div>
      <span className="status-text">{getStatusText()}</span>
      <div className="tools">
        <button className="button" onClick={onConnect}>Connect</button>
      </div>
    </div>
  );
}

export default ConnectionStatus;
