import React from 'react';
import { FileSystemTree,FileNode } from './FileSystemTree';
import './FileSystemTreeDemo.css';

export const FileSystemTreeDemo = () => {
    const fileSystemData = {
    id: 'root',
    name: 'root',
    type: 'folder',
    children: [
      {
        id: 'folder1', 
        name: 'Folder 1',
        type: 'folder',
        children: [
          { id: 'file1', name: 'File 1.txt', type: 'file' },
            { id: 'file2', name: 'File 2.txt', type: 'file' },
        ],
      },
      { id: 'file3', name: 'File 3.txt', type: 'file' },
      {
        id: 'folder2',  
        name: 'Folder 2',
        type: 'folder',
        children: [
          { 
            id: 'subfolder1', name: 'Subfolder 1',
            type: 'folder',
            children: [],
          },
        ],
      },
    ],
  }as FileNode;
    return (
    <div className='file-system-tree-wrapper'>
        FileSystemTreeDemo
        <FileSystemTree data={fileSystemData} />
    </div>
)
}