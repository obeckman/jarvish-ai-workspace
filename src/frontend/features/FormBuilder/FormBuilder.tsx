import React, { useState, useCallback, useMemo, useContext, createContext } from 'react';
import { clientLogger } from '@/frontend/utils/clientLogger';

import type { FormSchema, FieldSchema, FieldGroup, GroupField, SelectField } from './types'


// --- 2. CONTEXT LAYER: State Management ---
// We use Context to avoid prop-drilling 'onChange' and 'values' through 10 layers of layout.
type FormContextType = {
    values: Record<string, unknown>;
    handleChange: (key: string, value: unknown) => void;
}
interface FormInputsProps {
    field: FieldSchema,
    value?: unknown,
    onChange: (key: string, value: unknown) => void;
}
const FormContext = createContext<FormContextType | null>(null);

const useFormState = () => {
    const context = useContext<FormContextType | null>(FormContext);
    if (!context) throw new Error("useFormState must be used within a FormProvider");
    return context;
};

// Helper: Transforms Schema Array -> { key: default_value }
const transformsSchemaIntoFormState = (schema: FieldGroup) => {
    return schema.reduce((acc, field) => {
        // If it's a group, we might need recursion, but let's keep it flat for now
        // or initialize based on field type
        if (field.type === 'group') return acc; // or handle nested defaults

        // Check if the schema definition has a 'defaultValue' property (common pattern)
        // otherwise default to empty string or null
        acc[field.key] = "";
        return acc;
    }, {} as Record<string, unknown>);
};

// --- 3. ATOMIC COMPONENTS (The "Bricks") ---
// Note: These are "Controlled" components.
// Trade-off: Controlled inputs offer instant validation but can be slower.
// Optimization: React.memo ensures these only re-render if THEIR props change.
const TextInput = React.memo(({ field, value, onChange }: FormInputsProps) => (
    <div className="field-row">
        <label>{field.label}</label>
        <input
            type="text"
            value={typeof value === 'string' || typeof value === 'number' ? value : ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            className="border p-2 rounded"
        />
    </div>
));

const SelectInput = React.memo(({ field, value, onChange }: FormInputsProps) => (
    <div className="field-row">
        <label>{field.label}</label>
        <select
            value={typeof value === 'string' || typeof value === 'number' ? value : ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            className="border p-2 rounded"
        >
            <option value="">Select...</option>
            {(field as SelectField).options.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
));

// --- 4. THE RECURSIVE GROUP ---
// This handles nested structures (e.g., sections, row/col layouts).
const GroupFieldComponent = React.memo(({ field }: FormInputsProps) => {
    const groupField = field as GroupField;
    return (
        <fieldset className="border p-4 my-2">
            <legend className="font-bold">{groupField.label}</legend>
            {/* Recursion happens here via the Renderer */}
            <SchemaRenderer fieldGroup={groupField.children} />
        </fieldset>
    );
});

// --- 1. ARCHITECTURE: The Component Registry ---
// This acts as a dictionary. To add a new field type, we extend this object,
// effectively adhering to the Open/Closed principle.
const FIELD_REGISTRY = {
    text: TextInput,
    select: SelectInput,
    group: GroupFieldComponent, // Allows recursion
};

// --- 5. THE ENGINE: Dynamic Field Wrapper ---
// This component is the "Brain". It decides IF a component renders and WHICH one to render.
const FieldWrapper = React.memo(({ fieldSchema }: { fieldSchema: FieldSchema }) => {
    // for each FieldWrapper er get the form input values values from our FormContext 
    const { values, handleChange } = useFormState();


    // We evaluate the rule defined in the JSON against the current state.
    const isVisible = useMemo(() => {
        if (!fieldSchema.visibilityRule) return true;

        // Example rule: { field: "userType", operator: "eq", value: "admin" }
        const { field, operator, value } = fieldSchema.visibilityRule;
        const dependencyValue = values[field];

        if (operator === 'eq') return dependencyValue === value;
        if (operator === 'neq') return dependencyValue !== value;
        return true;
    }, [fieldSchema, values]);

    if (!isVisible) return null;

    // COMPONENT DICTIONARY LOOKUP
    const Component = FIELD_REGISTRY[fieldSchema.type];

    if (!Component) {
        console.warn(`Unknown field type: ${fieldSchema.type}`);
        return null;
    }

    // PASSING PROPS
    // We pass the specific value for this field, not the whole state object.
    return (
        <Component
            field={fieldSchema}
            value={values[fieldSchema.key]}
            onChange={handleChange}
        />
    );
});

// --- 6. THE RENDERER ---
// Takes a list of schema definitions and maps them to wrappers.
const SchemaRenderer = ({ fieldGroup }: { fieldGroup: FieldGroup }) => (<>{
    fieldGroup.map((fieldSchema) =>
        <FieldWrapper key={fieldSchema.key} fieldSchema={fieldSchema} />
    )}
</>)


// --- 7. THE ROOT COMPONENT ---
export const FormBuilder = ({ formSchema, onSubmit }: { formSchema: FieldGroup, onSubmit: (form: FormSchema) => void }) => {
    // 1. LAZY INITIALIZATION, on mount convert input FormSchema into initial Form state
    const [values, setValues] = useState<Record<string, unknown>>(() =>
        transformsSchemaIntoFormState(formSchema)
    );


    // Optimization: Stable function reference to prevent unnecessary re-renders in children
    const handleChange = useCallback((key: string, value: unknown) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSubmit({ id: 'submitted-form', formSchema });
    };

    // Optimization: Memoize the context value
    const contextValue = useMemo(() => ({ values, handleChange }), [values, handleChange]);

    return (
        <FormContext.Provider value={contextValue}>
            <form onSubmit={handleSubmit} className="p-4 max-w-lg mx-auto">
                <h2 className="text-xl font-bold mb-4">Dynamic Form Engine</h2>
                <SchemaRenderer fieldGroup={formSchema} />

                <button type="submit" className="mt-4 bg-blue-600 text-white p-2 rounded">
                    Submit
                </button>

                {/* Debug View */}
                <pre className="mt-4 bg-gray-100 p-2 text-xs">
                    {JSON.stringify(values, null, 2)}
                </pre>
            </form>
        </FormContext.Provider>
    );
};

// ParentComponent.tsx
export const FormBuilderWrapper = () => {
    const [schema] = useState<FormSchema | null>(null);

    // When 'schema' changes (e.g. loaded from ID 1 to ID 2), 
    // the 'key' changes.
    // React detects a new key and completely TRASHES the old component 
    // and mounts a fresh one. State is reset automatically.

    // Assuming schema has a unique 'id' or we generate a hash
    const schemaId = schema ? schema?.id : 'loading';

    if (!schema) return <div>Loading...</div>;

    return (
        <FormBuilder
            key={schemaId} // <--- THIS IS THE MAGIC
            formSchema={schema.formSchema}
            onSubmit={() => clientLogger.debug('submit')}
        />
    );
};
