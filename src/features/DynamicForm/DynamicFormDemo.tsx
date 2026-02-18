import React from 'react'
import { DynamicForm } from './DynamicForm'

export const DynamicFormDemo = () => {


    const handleFinalSubmit = React.useCallback(() => {
        console.debug('@@@ DynamicFormDemo handleFinalSubmit')
    }, [])

    return <DynamicForm onSubmit={handleFinalSubmit}  >
        <DynamicForm.Input name="email" label="Email Address" type="email" validationInfo={{
            fieldName: 'email',
            defaultValue: '',
            required: true,
            pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            patternMessage: 'Please enter a valid email address'
        }} />
        <DynamicForm.Input name="password" label="Password" type="password"
            validationInfo={{
                fieldName: 'password',
                defaultValue: '',
                required: true,
                // set regex pattern for at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                patternMessage: 'Please enter a valid password with at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character'
            }} />
        <DynamicForm.Input name="someInfo" label="someInfo" type="text"
            validationInfo={{
                fieldName: 'someInfo',
                defaultValue: '',
                required: false,
                // set regex pattern for alowed characters only
                pattern: /^[a-zA-Z0-9]*$/,
                patternMessage: 'Please enter a valid someInfo'
            }} />
        <DynamicForm.submit className="dynamic-form-Demo-submit" />


    </DynamicForm>
}
