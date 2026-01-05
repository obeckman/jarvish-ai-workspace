import React from 'react';
import Tabs, {TabVariant} from './';

export const TabsDemo = () => {
    return <div className="Tabs-demo-wrapper">
        <h2>Tabs Demo</h2>
         <Tabs defaultValue={TabVariant.NONE} >
    <div className="my-layout-wrapper">
      <nav className="tab-list">
        <Tabs.Content value={TabVariant.NONE}></Tabs.Content>
        <Tabs.Trigger value={TabVariant.PRIMARY}>primary</Tabs.Trigger>
        <Tabs.Trigger value={TabVariant.SECONDARY}>secondary</Tabs.Trigger>
      </nav>
    </div>
    
    <div className="panel-wrapper">
      <Tabs.Content value={TabVariant.NONE}></Tabs.Content>
      <Tabs.Content value={TabVariant.PRIMARY}>primary Account...</Tabs.Content>
      <Tabs.Content value={TabVariant.SECONDARY}>secondary Password...</Tabs.Content>
    </div>
  </Tabs>

    </div>
}