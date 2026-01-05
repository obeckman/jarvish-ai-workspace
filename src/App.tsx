import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { ModalContextProvider, ModalOpener } from './components/ModalProvider/ModalProvider'
import { CreateLocalStoreTester } from './components/CreateLocalStore/CreateLocalStoreTester'
import { FileSystemTreeDemo } from './components/FileSystemTree/FileSystemTreeDemo'
import { InfiniteVirtualizedScrollDemo } from './components/useInfiniteScroll/InfiniteVirtualizedScroll/InfiniteVirtualizedScrollDemo'
import { TabsDemo } from './components/Tabs/TabsDemo'

const TabVariant= {
    NONE: 'none',
    FileSystemTreeDemo: 'FileSystemTreeDemo',
    CreateLocalStoreTester: 'CreateLocalStoreTester',
    ModalOpener: 'ModalOpener',
    InfiniteVirtualizedScrollDemo: 'InfiniteVirtualizedScrollDemo',
TabsDemo: 'TabsDemo',
} as const; 

      
export type TabVariantValue = typeof TabVariant[keyof typeof TabVariant]; 

function App() {

  return (
    <>
      <ModalContextProvider>
        <FileSystemTreeDemo />
        <CreateLocalStoreTester />
        <ModalOpener />
        <InfiniteVirtualizedScrollDemo />
        <TabsDemo/>
      </ModalContextProvider>
    </>
  )
}

export default App
