// #12  Declarative API ,Context (for the Policy Engine) and an Access Control Wrapper (for Render Hijacking).


// Welcome to the hot seat. As a Tech Lead, I’m not looking for someone who can just "make it work." I’m looking for someone who understands Software Architecture—specifically how to build systems that remain invisible to the feature developers while providing robust security and performance.
// Here is how we separate the Seniors from the Juniors in a React System Design interview.

// 1. The Interview Question
// "Design a solution to handle granular, role-based visibility for UI components across a massive enterprise application. The solution must support nested permissions and dynamic role updates without causing a 'prop-drilling' nightmare or triggering unnecessary re-renders of the entire DOM tree when a user's permission state changes."
// The Trap: This sounds like a simple conditional rendering task. A junior will jump straight to if (user.role === 'admin'). A senior knows this is a Cross-Cutting Concern—a logic layer that needs to be applied globally without bloating the business logic of individual components.

import React, { useEffect } from 'react';
import {PermissionsTypes,PermissionsType, UserRoles, AccessControlWrapperProps, UserInfo } from './types';
import './AccessControlWrapper.css';


//

export const UserPermissionsContext = React.createContext<PermissionsType[]>([]);
export const UserSetPermissionsContext = React.createContext<React.Dispatch<React.SetStateAction<PermissionsType[]>>>(() => { });

export const useUserPermissionsContext = () => {
    const userPermissions = React.useContext(UserPermissionsContext);
    if (!userPermissions) {
        throw new Error('useUserPermissions must be used within a UserPermissionsContext.Provider');
    }
    return userPermissions;
}

export const useSetUserPermissionsContext = () => {
    const userPermissions = React.useContext(UserSetPermissionsContext);
    if (!userPermissions) {
        throw new Error('useUserPermissions must be used within a UserPermissionsContext.Provider');
    }
    return userPermissions;
}

export const UserPermissionsProvider = ({ userInfo, children }: { userInfo: UserInfo, children: React.ReactNode }) => {
    const [permissions, setPermissions] = React.useState<PermissionsType[]>([]);
    useEffect(() => {
        setPermissions(userInfo.userPermissions);
    }, [userInfo.userPermissions])
    return (
        <UserPermissionsContext.Provider value={permissions}>
            <UserSetPermissionsContext.Provider value={setPermissions}>
                {children}
            </UserSetPermissionsContext.Provider>
        </UserPermissionsContext.Provider>
    );
}

export const useAccessControl = () => {
    const userPermissions = useUserPermissionsContext();

    const hasAccess = React.useCallback(
        (requiredPermission: PermissionsType) => {
            return userPermissions.includes(requiredPermission);
        }, [userPermissions]);

    return { hasAccess };
}
const AccessControlWrapper = ({ permissionsType, children }: AccessControlWrapperProps) => {

    const [isAllowed, setIsAllowed] = React.useState(false);
    const userPermissions = useUserPermissionsContext();
    React.useEffect(() => {
        if (userPermissions.includes(permissionsType)) {
            setIsAllowed(true);
        }
        else setIsAllowed(false);
    }, [permissionsType, userPermissions])
    return (<>
        {isAllowed ? children : null}
    </>)
}

const SomeFeatureWithToggle = ({ permissionsType, children }: AccessControlWrapperProps) => {
    const { hasAccess } = useAccessControl();
    if (!hasAccess(permissionsType)) {
        return null;
    }
    return (<>
        {children}
    </>)
}
const AccessControlButton = ({ permissionsType, children }: { permissionsType: PermissionsType, children: React.ReactNode }) => {
    const setPermissions = useSetUserPermissionsContext();
    const onClick = () => {
        setPermissions(
            (prev) => prev.includes(permissionsType) ?
                prev.filter(p => p !== permissionsType) :
                [...prev, permissionsType]
        );
    }
    return (
        <button onClick={onClick}  >
            {children}
        </button>
    );
}
export const AccessControlWrapperDemo = () => {
    return (
        <div className="access-control-wrapper-demo">
            <UserPermissionsProvider userInfo={{
                    userRole :UserRoles.ADMIN,
                    userPermissions: [PermissionsTypes.FEATURE_A, PermissionsTypes.FEATURE_B]
            }}>
                <h2>Access Control Wrapper Demo</h2>
                <AccessControlWrapper permissionsType={PermissionsTypes.FEATURE_A}>
                    <div>Only visible to users with FEATURE_A</div>
                </AccessControlWrapper>
                <AccessControlWrapper permissionsType={PermissionsTypes.FEATURE_B}>
                    <div>Only visible to users with FEATURE_B</div>
                </AccessControlWrapper>
                <AccessControlButton permissionsType={PermissionsTypes.FEATURE_C}>Toggle FEATURE_C</AccessControlButton>

                <AccessControlWrapper permissionsType={PermissionsTypes.FEATURE_C}>
                    <div>Only visible to users with FEATURE_C</div>
                </AccessControlWrapper>
                <SomeFeatureWithToggle permissionsType={PermissionsTypes.FEATURE_C}>
                    <div>Some Feature Button: Visible to FEATURE_C</div>
                </SomeFeatureWithToggle>
            </UserPermissionsProvider>

        </div>
    );
}
