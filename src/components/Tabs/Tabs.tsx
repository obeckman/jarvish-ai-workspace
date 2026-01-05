import React from 'react';
import {
    TabsProps,TabsContentProps,TabsTriggerProps, 
    TabVariantValue,SetActiveTabProviderValue,ActiveTabProviderValue
} from './types';
import './Tabs.css';


const ActiveTabContext = React.createContext<null | ActiveTabProviderValue>(null);
const SetActiveTabContext = React.createContext<null | SetActiveTabProviderValue>(null);

const useActiveTabContext = () => {
    const context = React.useContext(ActiveTabContext);
    if (!context) {
        throw new Error('useActiveTabContext must be used within an ActiveTabProvider');
    }
    return context;
};

const useSetActiveTabContext = () => {
    const context = React.useContext(SetActiveTabContext);
    if (!context) {
        throw new Error('useSetActiveTabContext must be used within a SetActiveTabProvider');
    }
    return context;
};
export const Tabs = ({defaultValue, onChange, children}: TabsProps) => {
    const [activeTab, setActiveTab] = React.useState<TabVariantValue>(defaultValue);
    const SetActiveTabContextValue: SetActiveTabProviderValue = React.useMemo(() => ({
        setActiveTab
    }), []);

    const activeTabContextValue: ActiveTabProviderValue = React.useMemo(() => ({
        activeTab
    }), [activeTab]);
    
    return <div className="Tabs-component-wrapper">
        Tabs Component
        <SetActiveTabContext.Provider value={SetActiveTabContextValue}>
            <ActiveTabContext.Provider value={activeTabContextValue}>
                {children}
            </ActiveTabContext.Provider>
        </SetActiveTabContext.Provider>
        
    </div>
}
export const TabsTrigger = ({value, children}:TabsTriggerProps) => {
    const {setActiveTab} = useSetActiveTabContext();

    const onClick = () => {
        setActiveTab(value);
    }
    return <div className="Tabs-trigger" onClick={onClick}>
        {children}
    </div>
}
 
export const TabsContent = ({value, children}:TabsContentProps) => {
    const {activeTab} = useActiveTabContext();

    return <div className="Tabs-trigger" key={`TabsContent-${value}`}>
        {activeTab === value ? children : null}
    </div>
}

Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;
export default Tabs;

