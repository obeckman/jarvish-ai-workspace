// 1. Defined Operators for the "Meta-programming" logic
export type VisibilityOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'contains';

// 2. The Rule Definition
// Describes the logic: "Show this field if [field] [operator] [value]"
export interface VisibilityRule {
    field: string;
    operator: VisibilityOperator;
    value: string | number | boolean;
}

// 3. Base Interface
// Shared properties across ALL field types.
interface BaseField {
    key: string;       // Unique identifier for form state (e.g., "firstName")
    label: string;     // UI Label
    required?: boolean;
    visibilityRule?: VisibilityRule; // Optional conditional logic
}

// 4. Specific Field Definitions

// Type: 'text'
export interface TextField extends BaseField {
    type: 'text';
    placeholder?: string;
}

// Type: 'select'
export interface SelectField extends BaseField {
    type: 'select';
    options: string[]; // Specific to dropdowns
}

export type FieldGroup = FieldSchema[]

// Type: 'group' - THE RECURSIVE PATTERN
export interface GroupField extends BaseField {
    type: 'group';
    children: FieldGroup; // <--- Recursion happens here
}

// 5. The Discriminated Union (The "Master" Type)
// This is the type you use in your component props.
export type FieldSchema = TextField | SelectField | GroupField;

// 6. The Root Schema
export type FormSchema = {
    formSchema: FieldGroup;
    id: string
}