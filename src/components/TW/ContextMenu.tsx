import React from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onAction: (action: string) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onAction }) => {
  const style: React.CSSProperties = {
    position: 'fixed',
    top: y,
    left: x,
    backgroundColor: 'white',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    padding: '5px 0',
  };

  const itemStyle: React.CSSProperties = {
    padding: '8px 15px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333',
  };

  return (
    <div style={style}>
      <div style={itemStyle} onClick={() => onAction('info')}>ℹ️ View Info</div>
      <div style={itemStyle} onClick={() => onAction('attack')}>⚔️ Attack</div>
      <div style={itemStyle} onClick={() => onAction('trade')}>⚖️ Trade</div>
    </div>
  );
};

export default ContextMenu;