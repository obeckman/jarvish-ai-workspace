import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { ModalContextProvider, ModalOpener } from './components/ModalProvider/ModalProvider'
import { CreateLocalStoreTester } from './components/CreateLocalStore/CreateLocalStoreTester'
import { FileSystemTreeDemo } from './components/FileSystemTree/FileSystemTreeDemo'
import { UseInfiniteVirtualizedScrollDemo } from './components/useInfiniteScroll/useInfiniteVirtualizedScroll/useInfiniteVirtualizedScroll'
function App() {

  return (
    <>
      <ModalContextProvider>
        <FileSystemTreeDemo />
        <CreateLocalStoreTester />
        <ModalOpener />
        <UseInfiniteVirtualizedScrollDemo />
      </ModalContextProvider>
    </>
  )
}

export default App
