/*
4. The "Two-Way Binding" Sync

Here is the architecture breakdown. We are skipping the pleasantries. In a live interview, I expect you to identify the trap immediately and propose the scalable architecture before writing a single line of code.
The Interview Question
"I want you to build a reusable component that synchronizes two inputs. Let's say, a distance converter: Meters and Feet.
The catch: The user should be able to type into either input. When they type in Meters, Feet updates instantly. When they type in Feet, Meters updates instantly.
The Constraints:
You cannot use useEffect for the synchronization logic.
The solution must support $N$ number of synchronized inputs in the future (e.g., Meters, Feet, Yards, Inches) without refactoring the core logic."

*/
import React from 'react';
import {TwoWayBindingProps} from './types';
import './TwoWayBinding.css';

const conversionNames = {
    meters: 'Meters',
    feet: 'Feet',
    yards: 'Yards',
} as const

const conversionMapForDemo = {
    [conversionNames.meters]: {
        isDefault: true,
        toBase: (value: number) => value, // meters to meters
        fromBase: (value: number) => value, // meters to meters
    },
    [conversionNames.feet]: {
        toBase: (value: number) => value * 0.3048, // feet to meters
        fromBase: (value: number) => value / 0.3048, // meters to feet
    },
    [conversionNames.yards]: {
        toBase: (value: number) => value * 0.9144, // yards to meters
        fromBase: (value: number) => value / 0.9144, // meters to yards
    },
} as const;



type ConversionName = typeof conversionNames[keyof typeof conversionNames];


const TwoWayBindingContext = React.createContext<{
    setValue: (value: number, unit: ConversionName) => void,
    getValue: (unit: ConversionName) => number,
} | null>(null);

export const TwoWayBindingProvider  = ({conversionMap, initialBaseValue=0, children}: TwoWayBindingProps) =>{
    
    const [baseValue, setBaseValue] = React.useState<number>(initialBaseValue);
    
    const conversionMapRef = React.useRef(conversionMap);
    conversionMapRef.current = conversionMap;
        
  
    const setValue = React.useCallback( (value: number, unit: ConversionName) => {
        const conversion = conversionMapRef.current[unit];
        if(!conversion) throw new Error(`Conversion for unit ${unit} not found`);
        if (conversion) {
            if(conversion.isDefault) {
                setBaseValue(value);
            } else {
                const baseVal = conversion.toBase(value);
                setBaseValue(baseVal);
            }
        }
    }, [setBaseValue]);

    const getValue =React.useCallback((unit: ConversionName): number => {
        const conversion = conversionMapRef.current[unit];
        if(!conversion) throw new Error(`Conversion for unit ${unit} not found`);
        if (conversion) {
            if(conversion.isDefault) {
                return baseValue;
            } else {
                return conversion.fromBase(baseValue);
            }
        }
        return baseValue;
    }, [ baseValue]);

const contextValue = React.useMemo(() =>({
        setValue,
        getValue,
    }), [setValue, getValue]);

    return <TwoWayBindingContext.Provider value={contextValue}>
        {children}
    </TwoWayBindingContext.Provider>
}



const TwoWayBindingInput: React.FC<{unit: ConversionName}> = ({unit}) => {
    const {value, setValue} = useTwoWayBindingContext(unit);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        
        // Handle empty input to prevent NaN
        if (rawValue === "") {
            setValue(0); 
            return;
        }

        const newValue = parseFloat(rawValue);
        if (!isNaN(newValue)) {
            setValue(newValue);
        }
    }

    // Use an empty string if the value is 0 or NaN to allow clearing the field
    const displayValue = isNaN(value) ? "" : value;

    return <div className="two-way-binding-input">
        <label>{unit}:</label>
        <input type="number" value={displayValue} onChange={handleChange} />
    </div>
    
}
TwoWayBindingProvider.Input = TwoWayBindingInput;

const useTwoWayBindingContext = (unit: ConversionName) => {
    const context = React.useContext(TwoWayBindingContext);
    if(!context) throw new Error('useTwoWayBindingContext must be used within a TwoWayBindingProvider');
    
    const setValue = (value: number) => {
        
        context.setValue(Math.round(value*1000)/1000, unit);
    }
    const value = context.getValue(unit);


    return {value, setValue};
}

export const DistanceConverter = () => {

    return <div className="two-way-binding-demo">
        <h3>Distance Converter (Meters & Feet)</h3>
        <TwoWayBindingProvider conversionMap={conversionMapForDemo}>
            <TwoWayBindingProvider.Input unit={conversionNames.meters} />
            <TwoWayBindingProvider.Input unit={conversionNames.feet} />
            <TwoWayBindingProvider.Input unit={conversionNames.yards} />
        </TwoWayBindingProvider>
    </div>;
}
