export const UserRoles = {
    ADMIN: 'ADMIN',
    USER: 'USER',
    GUEST: 'GUEST',
} as const;
export type UserRole = typeof UserRoles[keyof typeof UserRoles];

export interface AccessControlWrapperProps {
    permissionsType: PermissionsType;
    children: React.ReactNode;
}

export const PermissionsTypes ={
    FEATURE_A: 'FEATURE_A',
    FEATURE_B: 'FEATURE_B',
    FEATURE_C: 'FEATURE_C',
    FEATURE_D: 'FEATURE_D',
} as const
export type PermissionsType = typeof PermissionsTypes[keyof typeof PermissionsTypes]

export type UserData = {
    userId?: string;
    userName?: string;
}
export type UserInfo ={
    userRole : UserRole;
    userPermissions: PermissionsType[];
} & UserData