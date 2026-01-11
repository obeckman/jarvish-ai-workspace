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
    
    return( 
        <SetActiveTabContext.Provider value={SetActiveTabContextValue}>
            <ActiveTabContext.Provider value={activeTabContextValue}>
                {children}
            </ActiveTabContext.Provider>
        </SetActiveTabContext.Provider>
    )
}
 const TabsTrigger = ({value, children, className}:TabsTriggerProps<T>) => {
    const {setActiveTab} = useSetActiveTabContext();

    const onClick = () => {
        setActiveTab(value);
    }
    
    return <div 
        className={`create_tab_system-Tabs-trigger ${className ?? ""}`} 
        onClick={onClick}
        key={`TabsTrigger-${value}`} 
        >
        {children}
    </div>
}
 
 const TabsContent = ({value, children, className}:TabsContentProps<T>) => {
    const {activeTab} = useActiveTabContext();
    const isActive = activeTab === value;

    if (!isActive) {
        return null;
    }

    return <div 
        role='tab'
        aria-selected={isActive}
        className={`create_tab_system-Tabs-content ${className ?? ""}`} 
        key={`TabsContent-${value}`}
        >
        {children}
    </div>
}

Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;
return Tabs;
}
export default createTabSystem;

