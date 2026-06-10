import React, { 
  useState, 
  useCallback, 
  createContext, 
  useContext, 
  useMemo,
  memo 
} from 'react';

import type { FileNode, TreeContextType } from './types';

export type { FileNode } from './types';

const TreeStateContext = createContext<TreeContextType | undefined>(undefined);


/**
 * useNodeLogic (Combined)
 * * This hook acts as the Bridge between:
 * 1. The Global Store (Context)
 * 2. The Local Component (Node Data)
 * * It encapsulates the context check AND the business logic.
 */
const useNodeLogic = (node: FileNode) => {
  // 1. DIRECT CONTEXT ACCESS
  const context = useContext(TreeStateContext);
  if (!context) {
    throw new Error('useNodeLogic must be used within a TreeStateContext Provider');
  }
  const { expandedIds, toggleNode } = context;

  // 2. LOGIC & DERIVED STATE
  const isFolder = node.type === 'folder';
  const hasChildren = !!node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  // 3. HANDLERS
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      toggleNode(node.id);
    }
  }, [node.id, isFolder, toggleNode]);

  return {
    isExpanded,
    hasChildren,
    isFolder,
    handleClick
  };
};

// --- COMPONENT (Clean & Minimal) ---

const TreeNode = memo(({ node }: { node: FileNode }) => {
  // The component is completely unaware that Context even exists.
  // It just asks for logic for *this* node.
  const { 
    isExpanded, 
    hasChildren, 
    isFolder, 
    handleClick 
  } = useNodeLogic(node);

  return (
    <div style={{ paddingLeft: '20px' }}>
      <div 
        onClick={handleClick}
        style={{ 
          cursor: isFolder ? 'pointer' : 'default',
          fontWeight: isExpanded ? 'bold' : 'normal',
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px'
        }}
      >
        <span>{isFolder ? (isExpanded ? '📂' : '📁') : '📄'}</span>
        {node.name}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
});

// --- ROOT ---

export const FileSystemTree = ({ data }: { data: FileNode }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleNode = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const contextValue = useMemo(() => ({ expandedIds, toggleNode }), [expandedIds, toggleNode]);

  return (
    <TreeStateContext.Provider value={contextValue}>
      <TreeNode node={data} key={data.id} />
    </TreeStateContext.Provider>
  );
};
