
import './App.css'
import { ModalContextProvider, ModalOpener } from './components/shared/ModalProvider/ModalProvider'
import { CreateLocalStoreTester } from './features/CreateLocalStore/CreateLocalStoreTester'
import { FileSystemTreeDemo } from './features/FileSystemTree/FileSystemTreeDemo'
import { InfiniteVirtualizedScrollDemo } from './features/InfiniteScroll/InfiniteVirtualizedScroll/InfiniteVirtualizedScrollDemo'
import  { TabsApiRaceConditionDemo } from './features/ApiRaceCondition/ApiRaceCondition'
import {APIAggregator} from './features/APIAggregator/APIAggregator'
import {AccessControlWrapperDemo} from './features/AccessControlWrapper/AccessControlWrapper'
import {TimeSeriesWidgetDemo} from './features/TimeSeriesWidget/TimeSeriesWidget'

import createTabSystem from './components/shared/Tabs'
import { UseReliableSubmitDemo } from './features/ReliableSubmit/UseReliableSubmitDemo'
import {ReliableSubmitManger} from './features/ReliableSubmit/useReliableSubmit'
import {TheSilentIntervalDemo} from './features/TheSilentInterval/TheSilentIntervalDemo'
import {DistanceConverter} from './features/TwoWayBinding/TwoWayBinding'
import {RetryMechanismDemo} from './features/RetryMechanism/RetryMechanismDemo'
import {DynamicGridCanvasDemo} from './features/DynamicGridCanvas/DynamicGridCanvas'
import {IndexDBDemo} from './features/indexDB/indexDBDemo'
import {DynamicFormDemo} from './features/DynamicForm/DynamicFormDemo'
import {GameApp} from './features/TW/game-app'
import {AskAgent} from './features/AskAgent/AskAgent'
import {RickAndMorty} from './features/RickAndMorty'
import { JarvishAgent, ContextAwareAgent } from './features/jarvishAgent'
import {NormalizationOfUsersAndGroups} from './features/NormalizationOfUsersAndGroups/NormalizationOfUsersAndGroups'
const TabVariant = {
  NONE: 'none',
  ContextAwareAgent: 'ContextAwareAgent',
  JarvishAgent: 'JarvishAgent',
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
  TheSilentIntervalDemo: 'TheSilentIntervalDemo',
  TwoWayBinding: 'TwoWayBinding',
  RetryMechanismDemo: 'RetryMechanismDemo',
  DynamicGridCanvasDemo: 'DynamicGridCanvasDemo',
  IndexDBDemo: 'IndexDBDemo',
  DynamicFormDemo: 'DynamicFormDemo',
  GameApp: 'GameApp',
  AskAgent: 'AskAgent',
  RickAndMorty: 'RickAndMorty',
  NormalizationOfUsersAndGroups: 'NormalizationOfUsersAndGroups'
} as const;


export type TabVariantValue = typeof TabVariant[keyof typeof TabVariant];

const Tabs = createTabSystem<TabVariantValue>()

function App() {
  return (

    <ModalContextProvider>
      <ReliableSubmitManger>
        
      <Tabs defaultValue={TabVariant.NONE} >
        <div className="app-layout-wrapper">
          <nav className="app-tab-list">
            <Tabs.Trigger value={TabVariant.NormalizationOfUsersAndGroups} className="tabs-trigger">Normalization Of Users And Groups</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.JarvishAgent} className="tabs-trigger">Jarvish Agent</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.AskAgent} className="tabs-trigger">Ask Agent</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.RickAndMorty} className="tabs-trigger">Rick And Morty</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.NONE} className="tabs-trigger">NONE</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.TheSilentIntervalDemo} className="tabs-trigger"># 5 - TheSilentIntervalDemo</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.TwoWayBinding} className="tabs-trigger">#4 -TwoWayBinding</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.RetryMechanismDemo} className="tabs-trigger">#17 - RetryMechanismDemo</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.DynamicGridCanvasDemo} className="tabs-trigger">DynamicGridCanvasDemo</Tabs.Trigger>
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
            <Tabs.Trigger value={TabVariant.IndexDBDemo} className="tabs-trigger">IndexDBDemo</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.DynamicFormDemo} className="tabs-trigger">DynamicFormDemo</Tabs.Trigger>
            <Tabs.Trigger value={TabVariant.GameApp} className="tabs-trigger">GameApp</Tabs.Trigger>
          </nav>

          <div className="app-panel-wrapper">
            <Tabs.Content value={TabVariant.NormalizationOfUsersAndGroups} className="tabs-content"><NormalizationOfUsersAndGroups /></Tabs.Content>
            <Tabs.Content value={TabVariant.JarvishAgent} className="tabs-content"><JarvishAgent /></Tabs.Content>
            <Tabs.Content value={TabVariant.AskAgent} className="tabs-content"><AskAgent /></Tabs.Content>
            <Tabs.Content value={TabVariant.RickAndMorty} className="tabs-content"><RickAndMorty /></Tabs.Content>
            <Tabs.Content value={TabVariant.NONE} className="tabs-content"></Tabs.Content>
            <Tabs.Content value={TabVariant.DynamicGridCanvasDemo} className="tabs-content"><DynamicGridCanvasDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.FileSystemTreeDemo} className="tabs-content"><FileSystemTreeDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.CreateLocalStoreTester} className="tabs-content"><CreateLocalStoreTester /></Tabs.Content>
            <Tabs.Content value={TabVariant.ModalOpener} className="tabs-content"><ModalOpener /></Tabs.Content>
            <Tabs.Content value={TabVariant.InfiniteVirtualizedScrollDemo} className="tabs-content"><InfiniteVirtualizedScrollDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.TabsApiRaceConditionDemo} className="tabs-content"><TabsApiRaceConditionDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.APIAggregator} className="tabs-content"><APIAggregator /></Tabs.Content>
            <Tabs.Content value={TabVariant.AccessControlWrapperDemo} className="tabs-content"><AccessControlWrapperDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.TimeSeriesWidgetDemo} className="tabs-content"><TimeSeriesWidgetDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.TheSilentIntervalDemo} className="tabs-content"><TheSilentIntervalDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.TwoWayBinding} className="tabs-content"><DistanceConverter /></Tabs.Content>
            <Tabs.Content value={TabVariant.UseReliableSubmitDemo} className="tabs-content"><UseReliableSubmitDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.RetryMechanismDemo} className="tabs-content"><RetryMechanismDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.IndexDBDemo} className="tabs-content"><IndexDBDemo /></Tabs.Content>  
            <Tabs.Content value={TabVariant.DynamicFormDemo} className="tabs-content"><DynamicFormDemo /></Tabs.Content>
            <Tabs.Content value={TabVariant.GameApp} className="tabs-content"><GameApp /> </Tabs.Content>
          </div>
        </div>
      </Tabs>
      
      </ReliableSubmitManger>
    </ModalContextProvider>


  )
}

export default App
