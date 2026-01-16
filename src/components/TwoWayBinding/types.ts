export interface TwoWayBindingProps {
    conversionMap: {
        [key: string]: {
            toBase: (value: number) => number;
            fromBase: (value: number) => number;
            isDefault?: boolean;
        };
    };

    initialBaseValue?: number;
    children: React.ReactNode;
}