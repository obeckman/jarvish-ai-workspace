 export const TabVariant= {
    NONE: 'none',
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
} as const;

      
export type TabVariantValue = typeof TabVariant[keyof typeof TabVariant]; 

export interface TabsProps <T>  {
    defaultValue: T;
    onChange?: (value: T) => void;
    children: React.ReactNode;
    className?: string;
}

export interface ActiveTabProviderValue <T> {
    activeTab: T;
} 

export interface SetActiveTabProviderValue <T> {
    setActiveTab: (value: T) => void;
} 

export interface TabsTriggerProps<T> {
    value: T;
    children: React.ReactNode;
    className?: string;
}

export interface TabsContentProps<T> {
    value: T;
    children?: React.ReactNode;
    className?: string;
}