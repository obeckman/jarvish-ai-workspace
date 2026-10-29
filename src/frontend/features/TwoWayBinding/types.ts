export type ConversionMap = Record<
    string,
    {
        toBase: (value: number) => number;
        fromBase: (value: number) => number;
        isDefault?: boolean;
    }
>

export interface TwoWayBindingProps {
    conversionMap: ConversionMap;
    initialBaseValue?: number;
    children: React.ReactNode;
}