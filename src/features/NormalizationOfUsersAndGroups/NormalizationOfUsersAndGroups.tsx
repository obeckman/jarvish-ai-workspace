import React from 'react';

type User = {
    id: string;
    name: string;
    groupIds: string[];
}

const mappings = {
    ID: 'id',
    USER_NAME: 'username',
    Group_Id: 'groupIds'
};

export const NormalizationOfUsersAndGroups = () => {

    const rawData = {
        "random_hash_1": { ID: "u101", USER_NAME: "Oren", Group_Id: ["g1", "g2"] },
        "random_hash_2": { ID: "u102", USER_NAME: "Hila", Group_Id: ["g1"] },
        "random_hash_3": { ID: "u103", USER_NAME: "Michal", Group_Id: ["g2", "g3"] }
    };

    // we want to transform the above raw data into a normalized structure that allows for efficient access patterns, 
    // such as looking up users by their ID and retrieving all users belonging to a specific group 
    // without having to iterate through the entire dataset each time.
    const normalizedData = {
        usersById: {} as Record<User['id'], User>, // keep users get and update in O(1) based on their ID
        groupsUserIds: {} as Record<string, string[]>, // mapping of groupId to array of userIds for quick retrieval of group members
        orderedUserIds: [] as string[], // maintain original order of users for any order-sensitive operations
    }

    // Normalization Process

    // convert our raw data object into an array of user objects for easier processing
    Object.values(rawData).forEach((rawUser) => {
        // we use Object.fromEntries to create a new user object with the keys mapped according to our defined mappings, 
        // ensuring consistent naming conventions in our normalized structure 
        const cleanUser = Object.fromEntries(
            Object.entries(rawUser).map(
                ([key, value]) =>
                    [mappings[key as keyof typeof mappings] || key, value]
            )
        ) as User;

        normalizedData.usersById[cleanUser.id] = cleanUser;
        normalizedData.orderedUserIds.push(cleanUser.id);

        cleanUser.groupIds.forEach(groupId => {
            if (!normalizedData.groupsUserIds[groupId]) {
                normalizedData.groupsUserIds[groupId] = [];
            }
            normalizedData.groupsUserIds[groupId] = [
                ...normalizedData.groupsUserIds[groupId],
                ...cleanUser.groupIds
            ];
        });

    });
    console.debug('Normalized Data:', normalizedData);

    return (<div style={{ padding: '20px' }}>
        <h2>Normalization of Users and Groups</h2>
        <p>
            {JSON.stringify(rawData)}
        </p>
        <p>
            Normalized Data:
        </p>
        <p>
            {JSON.stringify(normalizedData)}
        </p>
    </div>);
}