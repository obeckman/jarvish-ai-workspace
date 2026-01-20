import React, { DetailedHTMLProps } from 'react'
import {
    DynamicFormProps,
    DynamicFormInputProps,
    DynamicFormContextValue,
    ValidationConfig
} from './types';
import './DynamicForm.css'

//export type DynamicFormInputData = {

export const DynamicFormContext = React.createContext<DynamicFormContextValue | null>(null);

export const useDynamicForm = () => {
    const context = React.useContext(DynamicFormContext);
    if (!context) {
        throw new Error('useDynamicForm must be used within a DynamicFormProvider');
    }
    return context;

}

export const DynamicForm = ({ children, onSubmit }: DynamicFormProps) => {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const formValuesStateRef = React.useRef<Record<string, string>>({});
    
    const setFormValues = React.useCallback((updater: (prevValues: Record<string, string>) => Record<string, string>) => {
        formValuesStateRef.current = updater(formValuesStateRef.current);
    }, []);
    
    const [validationErrors, setValidationErrors] = React.useState<{ fieldName: string, message: string }[]>([]);
    const validationMapRef = React.useRef<Record<string, ValidationConfig>>({});

    const [submitErrors, setSubmitErrors] = React.useState<any[]>([]);

    
    const registerInput = React.useCallback((name: string, validationInfo: ValidationConfig) => {
        validationMapRef.current[name] = validationInfo;
    }, []);

    const unregisterInput = React.useCallback((name: string) => {
        delete validationMapRef.current[name];
    }, []);

    const validateInputs = React.useCallback(() => {
        console.debug('@@@ DynamicForm validateInputs', formValuesStateRef.current, validationMapRef.current);
        let isAnyErrors = false        
        Object.entries(validationMapRef.current).forEach(([name, validationInfo]) => {
            const res = validateInput(name, formValuesStateRef.current[name]);
            if (!res) isAnyErrors = true;
        })
        return !isAnyErrors;
    }, []);

    const validateInput = React.useCallback((name: string, value: string) => {
        console.debug('@@@ DynamicForm validateInput', name, value);
        const validationInfo =  validationMapRef.current[name];
        if (!validationInfo) return true;
        const errors: { fieldName: string, message: string }[] = [];
        if (validationInfo.required && !value) {
            errors.push({ fieldName: name, message: `${name} is required` });
        }

        if (validationInfo.pattern && !validationInfo.pattern.test(value)) {
            errors.push({ fieldName: name, message: validationInfo.patternMessage || `${name} is invalid` });
        }
        
        setValidationErrors((prevErrors) => {
                const otherFieldsErrors =prevErrors.filter(error => error.fieldName !== name)
                return [...otherFieldsErrors, ...errors]
        });
       
        return errors.length === 0;
    }, []);

    const handleSubmit = React.useCallback(async (e?: React.SyntheticEvent) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        console.debug('@@@ DynamicForm handleSubmit', formValuesStateRef.current);
        setIsSubmitting(true);
        setSubmitErrors([]);

        if (validateInputs()) {
            try {
                if (onSubmit) {
                    await onSubmit(formValuesStateRef.current);
                }
                setIsSubmitting(false);
            } catch (error: any) {
                console.error('@@@ DynamicForm submission error', error);
                setSubmitErrors([{ message: error?.message || 'Submission failed due to an unknown error' } ]);
                setIsSubmitting(false);
            }
        } else {
            setIsSubmitting(false);
        }
    }, [validateInputs, onSubmit]);

    const DynamicFormContextValue = React.useMemo(() => ({
        isSubmitting,
        validationErrors,
        submitErrors,
        handleSubmit,
        registerInput,
        unregisterInput,
        setFormValues,
        validateInput
    }), [isSubmitting, validationErrors, submitErrors, handleSubmit, registerInput, unregisterInput, setFormValues, validateInput]);

    return <DynamicFormContext.Provider value={DynamicFormContextValue}>
        {children}
    </DynamicFormContext.Provider>
}

export const useDynamicFormInputData = (name: string, validationInfo: ValidationConfig) => {
    const { isSubmitting, validationErrors, registerInput, unregisterInput, setFormValues, validateInput } = useDynamicForm()
    const validationInfoMemoized = React.useMemo(() => validationInfo, [
        validationInfo.fieldName,
        validationInfo.required,
        validationInfo.defaultValue,
        validationInfo.pattern,
        validationInfo.patternMessage
    ]);

    React.useEffect(() => {
        if (name && validationInfoMemoized) {
            registerInput(name, validationInfoMemoized);
        }
        return () => {
            if (name) {
                unregisterInput(name);
            }
        }
    }, [name, validationInfoMemoized, registerInput, unregisterInput]);

    const isValidationError = React.useMemo(() =>
        validationErrors.length > 0 &&
        validationErrors.some((validationError) => validationError.fieldName === name)
        , [validationErrors]);


    const validationErrorMessage = React.useMemo(() => {
        if (isValidationError) {
            return validationErrors.filter((error) => error.fieldName === name)
                .reduce((acc, error) => acc += error.message, '');
        } else {
            return '';
        }

    }, [isValidationError]);

    const setValue = React.useCallback((value: string) => {
        validateInput(name, value);
        setFormValues((prevValues) => ({
            ...prevValues,
            [name]: value
        }));
    }, [name, setFormValues, validateInput]);

    return {
        isSubmitting,
        isValidationError,
        validationErrorMessage,
        setValue,
    }
}

export const DynamicFormInput = (props: DynamicFormInputProps) => {
    const {name, validationInfo, label, children, ...rest} = props;
    const { isSubmitting, isValidationError, validationErrorMessage,setValue } = useDynamicFormInputData(name, validationInfo as ValidationConfig)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setValue(value);
    };
    console.debug('@@@ DynamicFormInput render', name, isSubmitting, isValidationError, validationErrorMessage);
    return <div className={`dynamic-form-input ${isSubmitting ? 'submitting' : ''}`}>
        <label htmlFor={name}>{label}</label>

        <div className={`dynamic-form-input-error ${isValidationError ? 'error' : ''}`}>
            {validationErrorMessage}
        </div>
        <input name={name} key={`DynamicFormInput` + name} onChange={handleChange} {...rest} />
        {children}
    </div>
}

const DynamicFormSubmit = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    const { isSubmitting, submitErrors, handleSubmit } = useDynamicForm()
    console.debug('@@@ DynamicFormSubmit render isSubmitting',isSubmitting)
    return <div className='dynamic-form-demo-submit'>
        <label >{props.name}</label>
        <div className="dynamic-form-demo-submit-error">
            {submitErrors.map((error, index) => (
                <div key={index}>{error.message}</div>
            ))}
        </div>
        <button {...props} type="submit" onClick={handleSubmit} disabled={isSubmitting} className={`dynamic-form-submit ${props.className ? props.className : ''}`}>
            {props.children}
        </button>
    </div>
}
DynamicForm.Input = DynamicFormInput
DynamicForm.submit = DynamicFormSubmit
