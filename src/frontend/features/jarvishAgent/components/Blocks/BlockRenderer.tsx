import React, { Suspense } from 'react';
import { AgentMessageBlock } from '../../types';
import { BLOCK_COMPONENTS } from './BlockRegistry';
import styles from '../../jarvish-agent.module.scss';

interface BlockRendererProps {
  blocks: AgentMessageBlock[];
  onAction?: (label: string) => void;
}

export const BlockRenderer: React.FC<BlockRendererProps> = React.memo(({ blocks, onAction }) => {
  console.log(`[BlockRenderer] Rendering ${blocks.length} blocks:`, blocks);
  return (
    <div className={styles.blocksContainer}>
      {blocks.map((block, index) => {
        const Component = BLOCK_COMPONENTS[block.type];

        if (!Component) {
          console.warn(`[BlockRenderer] No component found for block type: ${block.type}`);
          return null;
        }

        console.log(`[BlockRenderer] Mounting block type: ${block.type} at index ${index}`);

        return (
          <Suspense key={`${block.type}-${index}`} fallback={<div className={styles.blockLoading}>Loading block...</div>}>
            <Component {...block} onAction={onAction} />
          </Suspense>
        );
      })}
    </div>
  );
});

BlockRenderer.displayName = 'BlockRenderer';
