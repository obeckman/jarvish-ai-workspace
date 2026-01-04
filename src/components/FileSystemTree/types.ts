export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

export interface TreeContextType {
  expandedIds: Set<string>;
  toggleNode: (id: string) => void;
}
