import React from 'react';
import { ContextMenuAction } from './types';
import styles from './context-menu.module.scss';

interface ContextMenuProps {
  x: number;
  y: number;
  onAction: (action: ContextMenuAction) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onAction }) => {
  return (
    <div className={styles.menu} style={{ top: y, left: x }}>
      <div className={styles.item} onClick={() => onAction('info')}>ℹ️ View Info</div>
      <div className={styles.item} onClick={() => onAction('attack')}>⚔️ Attack</div>
      <div className={styles.item} onClick={() => onAction('ambush')}>🛡️ Ambush</div>
      <div className={styles.item} onClick={() => onAction('trade')}>⚖️ Trade</div>
    </div>
  );
};

export default ContextMenu;