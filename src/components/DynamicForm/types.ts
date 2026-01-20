import React, {DetailedHTMLProps} from 'react'
export interface DynamicFormProps  {
    onSubmit: ()=> void,
    children : React.ReactNode
} 
export interface DynamicFormInputProps extends DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
    name:string,
    label:string,
    type: React.HTMLInputTypeAttribute,
    children?: React.ReactNode,
    validationInfo: ValidationConfig,
}  
export  type DynamicFormContextValue =  {
    isSubmitting: boolean,
    validationErrors: {fieldName: string, message: string}[],
    submitErrors: any[],
    handleSubmit: () => void,
    registerInput: (name: string, validationInfo: any) => void,
    unregisterInput: (name: string) => void,
    setFormValues: (updater: (prevValues: Record<string, string>) => Record<string, string>) => void,
    validateInput: (name: string, value: string) => boolean,
}

export type ValidationConfig = {
    fieldName: string,
    required?: boolean, 
    defaultValue: string, 
    pattern?: RegExp, 
    patternMessage?: string
}
