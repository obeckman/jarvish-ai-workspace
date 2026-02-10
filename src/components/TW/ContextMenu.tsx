import React from 'react';
import { ContextMenuAction } from './types';
import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  onAction: (action: ContextMenuAction) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onAction }) => {
  return (
    <div className="menu" style={{ top: y, left: x }}>
      <div className="item" onClick={() => onAction('info')}>ℹ️ View Info</div>
      <div className="item" onClick={() => onAction('attack')}>⚔️ Attack</div>
      <div className="item" onClick={() => onAction('ambush')}>🛡️ Ambush</div>
      <div className="item" onClick={() => onAction('trade')}>⚖️ Trade</div>
    </div>
  );
};

export default ContextMenu;