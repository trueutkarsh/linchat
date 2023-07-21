import React from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import './UserChatScreen.css';
import graphqlClient from '../graphqlClient';
// GraphQL queries and mutations here

const UserChatScreen = () => {
    const location = useLocation();
    const {
        chain_id,
        default_chain_id,
        application_id,
        username
    } = location.state;

    const adminAppGQLClient = graphqlClient(8080, default_chain_id, application_id);
    const userAppGQLClient = graphqlClient(8080, chain_id, application_id);

    console.log(chain_id, default_chain_id, application_id, username);

    // GraphQL queries and mutations usage here

    const handleSendMessage = () => {
        // Send message mutation logic here
    };

    return (
        // User chat screen UI here
        <div className='UserChatBox'>
            <h1>User Chat Screen</h1>
        </div>
    );
};

export default UserChatScreen;
