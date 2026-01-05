import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { ModalContextProvider, ModalOpener } from './components/ModalProvider/ModalProvider'
import { CreateLocalStoreTester } from './components/CreateLocalStore/CreateLocalStoreTester'
import { FileSystemTreeDemo } from './components/FileSystemTree/FileSystemTreeDemo'
import { InfiniteVirtualizedScrollDemo } from './components/useInfiniteScroll/InfiniteVirtualizedScroll/InfiniteVirtualizedScrollDemo'
import createTabSystem from './components/Tabs'

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
  const Tabs = createTabSystem<TabVariantValue>()
  return (
    <ModalContextProvider>
    
       
         <Tabs defaultValue={TabVariant.NONE} >
    <div className="my-layout-wrapper">
      <nav className="tab-list">
        <Tabs.Trigger value={TabVariant.NONE} className="tabs-trigger">NONE</Tabs.Trigger>
        <Tabs.Trigger value={TabVariant.FileSystemTreeDemo} className="tabs-trigger">FileSystemTreeDemo</Tabs.Trigger>
        <Tabs.Trigger value={TabVariant.CreateLocalStoreTester} className="tabs-trigger">CreateLocalStoreTester</Tabs.Trigger>
        <Tabs.Trigger value={TabVariant.ModalOpener} className="tabs-trigger">ModalOpener</Tabs.Trigger>
        <Tabs.Trigger value={TabVariant.InfiniteVirtualizedScrollDemo} className="tabs-trigger">InfiniteVirtualizedScrollDemo</Tabs.Trigger>
      </nav>
    </div>
    
    <div className="panel-wrapper">
      <Tabs.Content value={TabVariant.NONE} className="tabs-content"></Tabs.Content>
      <Tabs.Content value={TabVariant.FileSystemTreeDemo} className="tabs-content"><FileSystemTreeDemo /></Tabs.Content>
      <Tabs.Content value={TabVariant.CreateLocalStoreTester} className="tabs-content"><CreateLocalStoreTester /></Tabs.Content>
      <Tabs.Content value={TabVariant.ModalOpener} className="tabs-content"><ModalOpener /></Tabs.Content>
      <Tabs.Content value={TabVariant.InfiniteVirtualizedScrollDemo} className="tabs-content"><InfiniteVirtualizedScrollDemo /></Tabs.Content>
      
    </div>
  </Tabs>
  {/* <ModalContextProvider>
        <FileSystemTreeDemo />
        <CreateLocalStoreTester />
        <ModalOpener />
        <InfiniteVirtualizedScrollDemo />
        
      </ModalContextProvider> */}
  </ModalContextProvider>
      
    
  )
}

export default App
