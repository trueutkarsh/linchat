import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useLocation } from 'react-router-dom';
import graphqlClient from '../graphqlClient';
import './GroupChatScreen.css';

// GraphQL queries and mutations here
const MEMBERS_QUERY = gql`
    query owner($start: Int!, $end: Int!) {
        owner(start: $start, end: $end)
    }    
`;

const SEND_MSG_MUTATION = gql`
    mutation send($destn: Account! $text: String!){
        send(destn: $destn, text: $text)
    }
`;

const SET_GROUP_CHAT_FLAG = gql`
    mutation setGroupChatFlag($flag: Boolean!){
        setGroupChatFlag(flag: $flag)
    }
`;

const MESSAGES_QUERY = gql`
    query messages($account: Account!) {
        messages(account: $account)
    }
`;

const GroupChatScreen = () => {
    const location = useLocation();
    // state variables from prev screen
    const [adminAppGQLClient, setAdminAppGQLClient] = useState(graphqlClient(8080, location.state.default_chain_id, location.state.application_id));
    const [userAppGQLClient, setUserAppGQLClient] = useState(graphqlClient(8080, location.state.chain_id, location.state.application_id));
    const [defaultChainId, setDefaultChainId] = useState(location.state.default_chain_id);
    const [chainId, setChainId] = useState(location.state.chain_id);
    const [groupChatName, setGroupChatName] = useState(location.state.groupChatName);

    // component states
    const [inputMessage, setInputMessage] = useState('');
    const [recipientChainData, setRecipientChainData] = useState(null);
    const [existingMembersData, setExistingMembersData] = useState([]);
    const [userMessagesData, setUserMessagesData] = useState([]);

    // GraphQL queries

    // fetch exiting chats of user
    const { loading: existingMembersLoading, error: existingMembersError, data: existingMembersResponse } = useQuery(
        MEMBERS_QUERY,
        {
            client: userAppGQLClient,
            variables: {
                start: 0,
                end: 100
            },
            fetchPolicy: 'network-only',
            pollInterval: 1500
        },
    );    

    // send the first message to register the group chat with admin
    const [sendInitMessageMutation, { sendInitMessageData, sendInitMessageLoading, sendInitMessageError }] = useMutation(
        SEND_MSG_MUTATION,
        {
            client: userAppGQLClient
        }
    );
    
    const [setGroupChatFlagMutation, {setGroupChatFlagData, setGroupChatFlagLoading, setGroupChatFlagError}] = useMutation(
        SET_GROUP_CHAT_FLAG,
        {
            client: userAppGQLClient
        }
    )

    // list all the members of the chat
    useEffect(() => {
        if (!existingMembersLoading && !existingMembersError && existingMembersResponse !== null) {
            setExistingMembersData(existingMembersResponse.owner)
        }
    }, 
        [existingMembersLoading, existingMembersError, existingMembersResponse]
    )
    
    



    // send the registration msg and 
    useEffect(() => {
        sendInitMessageMutation({
            client: userAppGQLClient,
            variables: {
                text: 'Hi !!',
                destn: {
                    username: 'admin',
                    chain_id: defaultChainId
                }
            }
        })
        .then((result) => {
            console.log('successfully sent hi !!', result)
            setGroupChatFlagMutation({
                client: userAppGQLClient,
                variables: {
                    flag: true
                }
            })
            .then((result) => {
                console.log("successfully changed to group chat", result)
            })
            .catch((error) => {
                console.error("error in changing group chat flag", error)
            })
        })
        .catch((error) => {
            console.error('error in sending hi', error);
        })
        
    }, [userAppGQLClient, defaultChainId, sendInitMessageMutation, setGroupChatFlagMutation])
    
    const { loading: userMessagesLoading, error: userMessagesError, data: userMessagesResponse } = useQuery(
        MESSAGES_QUERY,
        {
            client: userAppGQLClient,
            variables: {
                account: {
                    username: groupChatName,
                    chain_id: chainId
                }
            },
            fetchPolicy: 'network-only',
            pollInterval: 1000
        }
    )

    useEffect(() => {
        if (!userMessagesLoading && !userMessagesError) {
            let messages = userMessagesResponse.messages || [];
            // filter the init messages or sent by group chat
            // messages = messages.filter((msg => msg.username === groupChatName))
            messages.sort((a, b) => a.timestamp - b.timestamp)
            setUserMessagesData(messages);
        }
    },
        [userMessagesLoading, userMessagesError, userMessagesResponse]
    );    


    
    const handleSendMessage = async () => {
        // Send message mutation logic here
        await userAppGQLClient
        .mutate({
            mutation: SEND_MSG_MUTATION,
            variables: {
                text: inputMessage,
                destn: {
                    username: groupChatName,
                    chain_id: chainId
                }
            }
        });
        setInputMessage("");
    };
    

    return (
        <div>
            {
                existingMembersLoading ? (
                    <div>
                        <p>Loading !!</p>
                        <p>{existingMembersLoading.toString()}</p>
                    </div>
                ) : existingMembersError ? (
                    <div>
                        <p>Error loading data</p>
                        <p>{existingMembersError.toString()}</p>
                    </div>
                ) : (

                    <div className='ChatsContainer'>

                        <div className='GroupChatBox'>
                            <h1>Group Chat Screen</h1>
                            <h2 style={{ backgroundColor: 'lightblue' }}>{groupChatName}</h2>

                            <div className='Messages'>
                                <label>Messages will come here</label>
                                <div >
                                    <ul className='MessagesList' >
                                        {
                                            userMessagesData.map((msg, index) => {
                                                if (msg.account.username === groupChatName) {
                                                    return <li className='UserMessages' key={index}> <label className='UserLabel'>{'admin'} </label> <label className='MessageText'> {' -> ' + msg.text} </label> </li>
                                                } else {
                                                    return <li className='RecipientMessages' key={index}><label className='UserLabel'>{msg.account.username} </label> <label className='MessageText'> {' -> ' + msg.text} </label></li>
                                                }
                                            })
                                        }
                                    </ul>
                                </div>

                            </div>

                            <div className='MessageInputBox'>
                                <input id='messageinput' type='text' name='inputMessage' value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} ></input>
                                <button id='send' onClick={handleSendMessage}>Send</button>
                            </div>
                        </div>

                        <div className='ActiveMembersSideBar'>
                            <label>Active Members</label>
                            <div className='ActiveMembersList'>
                                {
                                    existingMembersData.map((activeChat, index) => {
                                        return <label className='ActiveMembersLabel' key={index} > {activeChat.username[0] === '#' ? 'admin':activeChat.username }</label>
                                    })
                                }
                            </div>
                        </div>


                    </div>

                )

            }
        </div>
    );
};

export default GroupChatScreen;
