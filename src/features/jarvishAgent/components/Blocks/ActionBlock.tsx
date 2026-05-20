import React, { useState, useCallback } from 'react';
import { z } from 'zod';
import { Loader2, Play } from 'lucide-react';
import styles from '../../jarvish-agent.module.scss';
import { ActionBlockSchema } from '@/shared/jarvish.blocks';

interface ActionBlockProps {
  actionId: string;
  label: string;
  payload?: z.infer<typeof ActionBlockSchema>['payload'];
  disabled?: boolean;
  loading?: boolean;
  onAction?: (label: string) => void;
}

export const ActionBlock: React.FC<ActionBlockProps> = React.memo(({ 
  label, 
  disabled, 
  loading: externalLoading, 
  onAction 
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = externalLoading || internalLoading;

  const handleClick = useCallback(() => {
    if (onAction) {
      setInternalLoading(true);
      onAction(label);
      // We don't necessarily reset internalLoading here because 
      // the whole component might unmount/re-render when the agent responds
    }
  }, [label, onAction]);

  return (
    <div className={styles.actionBlock}>
      <button 
        className={styles.actionButton} 
        disabled={disabled || isLoading}
        onClick={handleClick}
      >
        {isLoading ? <Loader2 size={16} className={styles.spin} /> : <Play size={16} />}
        <span>{label}</span>
      </button>
    </div>
  );
});

ActionBlock.displayName = 'ActionBlock';
