import React from 'react';
import {
    TabsProps,TabsContentProps,TabsTriggerProps, 
    SetActiveTabProviderValue,ActiveTabProviderValue
} from './types';
import './Tabs.css';


const createTabSystem = <T,>() => {

const ActiveTabContext = React.createContext<null | ActiveTabProviderValue<T>>(null);
const SetActiveTabContext = React.createContext<null | SetActiveTabProviderValue<T>>(null);

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
 const Tabs = ({defaultValue, onChange, children, className}: TabsProps<T>) => {
    const [activeTab, setActiveTab] = React.useState<T>(defaultValue);
    const SetActiveTabContextValue: SetActiveTabProviderValue<T> = React.useMemo(() => ({
        setActiveTab
    }), []);

    const activeTabContextValue: ActiveTabProviderValue<T> = React.useMemo(() => ({
        activeTab
    }), [activeTab]);

    React.useEffect(() => {
        if (onChange) {
            onChange(activeTab);
        }
    }, [activeTab,]);
    
    return <div className={className ?? "Tabs-component-wrapper"}>
        Tabs Component
        <SetActiveTabContext.Provider value={SetActiveTabContextValue}>
            <ActiveTabContext.Provider value={activeTabContextValue}>
                {children}
            </ActiveTabContext.Provider>
        </SetActiveTabContext.Provider>
        
    </div>
}
 const TabsTrigger = ({value, children, className}:TabsTriggerProps<T>) => {
    const {setActiveTab} = useSetActiveTabContext();

    const onClick = () => {
        setActiveTab(value);
    }
    return <div 
        className={className ?? "Tabs-trigger"} 
        onClick={onClick}
        key={`TabsTrigger-${value}`} 
        >
        {children}
    </div>
}
 
 const TabsContent = ({value, children, className}:TabsContentProps<T>) => {
    const {activeTab} = useActiveTabContext();

    return <div 
        className={className ?? "Tabs-content"} 
        key={`TabsContent-${value}`}
        >
        {activeTab === value ? children : null}
    </div>
}

Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;
return Tabs;
}
export default createTabSystem;

