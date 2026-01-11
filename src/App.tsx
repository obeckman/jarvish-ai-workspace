
import './App.css'
import { ModalContextProvider, ModalOpener } from './components/ModalProvider/ModalProvider'
import { CreateLocalStoreTester } from './components/CreateLocalStore/CreateLocalStoreTester'
import { FileSystemTreeDemo } from './components/FileSystemTree/FileSystemTreeDemo'
import { InfiniteVirtualizedScrollDemo } from './components/useInfiniteScroll/InfiniteVirtualizedScroll/InfiniteVirtualizedScrollDemo'
import  { TabsApiRaceConditionDemo } from './components/ApiRaceCondition/ApiRaceCondition'
import {APIAggregator} from './components/APIAggregator/APIAggregator'
import {AccessControlWrapperDemo} from './components/AccessControlWrapper/AccessControlWrapper'
import {TimeSeriesWidgetDemo} from './components/TimeSeriesWidget/TimeSeriesWidget'

import createTabSystem from './components/Tabs'
import { UseReliableSubmitDemo } from './components/useReliableSubmit/UseReliableSubmitDemo'
import {ReliableSubmitManger} from './components/useReliableSubmit/useReliableSubmit'

const TabVariant = {
  NONE: 'none',
  FileSystemTreeDemo: 'FileSystemTreeDemo',
  CreateLocalStoreTester: 'CreateLocalStoreTester',
  ModalOpener: 'ModalOpener',
  InfiniteVirtualizedScrollDemo: 'InfiniteVirtualizedScrollDemo',
  TabsDemo: 'TabsDemo',
  TabsApiRaceConditionDemo: 'TabsApiRaceConditionDemo',
  APIAggregator: 'APIAggregator',
  AccessControlWrapperDemo: 'AccessControlWrapperDemo',
  TimeSeriesWidgetDemo: 'TimeSeriesWidgetDemo',
  UseReliableSubmitDemo: 'UseReliableSubmitDemo',
} as const;


export type TabVariantValue = typeof TabVariant[keyof typeof TabVariant];

function App() {
  const Tabs = createTabSystem<TabVariantValue>()
  return (

    <ModalContextProvider>
      <ReliableSubmitManger>
      <Tabs defaultValue={TabVariant.NONE} >
        <div className="app-layout-wrapper">
          <nav className="app-tab-list">
            <Tabs.Trigger value={TabVariant.NONE} className="tabs-trigger">NONE</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.FileSystemTreeDemo} className="tabs-trigger">FileSystemTreeDemo</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.CreateLocalStoreTester} className="tabs-trigger">CreateLocalStoreTester</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.ModalOpener} className="tabs-trigger">ModalOpener</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.InfiniteVirtualizedScrollDemo} className="tabs-trigger">InfiniteVirtualizedScrollDemo</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.TabsApiRaceConditionDemo} className="tabs-trigger">TabsApiRaceConditionDemo</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.TabsApiRaceConditionDemo} className="tabs-trigger">TabsApiRaceConditionDemo</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.APIAggregator} className="tabs-trigger">APIAggregator</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.AccessControlWrapperDemo} className="tabs-trigger">AccessControlWrapperDemo</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.TimeSeriesWidgetDemo} className="tabs-trigger">TimeSeriesWidgetDemo</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.UseReliableSubmitDemo} className="tabs-trigger">UseReliableSubmitDemo</Tabs.Trigger>
          </nav>

          <div className="app-panel-wrapper">
            <Tabs.Content value={TabVariant.NONE} className="tabs-content"></Tabs.Content>
            <Tabs.Content value={TabVariant.FileSystemTreeDemo} className="tabs-content"><FileSystemTreeDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.CreateLocalStoreTester} className="tabs-content"><CreateLocalStoreTester /></Tabs.Content>
            <Tabs.Content value={TabVariant.ModalOpener} className="tabs-content"><ModalOpener /></Tabs.Content>
            <Tabs.Content value={TabVariant.InfiniteVirtualizedScrollDemo} className="tabs-content"><InfiniteVirtualizedScrollDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.TabsApiRaceConditionDemo} className="tabs-content"><TabsApiRaceConditionDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.APIAggregator} className="tabs-content"><APIAggregator /></Tabs.Content>
            <Tabs.Content value={TabVariant.AccessControlWrapperDemo} className="tabs-content"><AccessControlWrapperDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.TimeSeriesWidgetDemo} className="tabs-content"><TimeSeriesWidgetDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.UseReliableSubmitDemo} className="tabs-content"><UseReliableSubmitDemo /></Tabs.Content>
          </div>
        </div>
      </Tabs>
      </ReliableSubmitManger>
    </ModalContextProvider>


  )
}

export default App
