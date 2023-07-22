import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, gql, useLazyQuery } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import './UserChatScreen.css';
import graphqlClient from '../graphqlClient';
// GraphQL queries and mutations here


const SCHEMA_TYPEDEFS=gql`
    type Account {
        chain_id: String!
        username: String!
    }

    input Account {
        chain_id: String!
        username: String!
    }
`;


const SEARCH_CHATS_QUERY=gql`
    query messagesKeys($count: Int!) {
        messagesKeys(count: $count)
    }    
`;

const MESSAGES_QUERY=gql`
    query messages($account: Account!) {
        messages(account: $account)
    }
`;

const SEND_MSG_MUTATION=gql`
    mutation send($destn: Account! $text: String!){
        send(destn: $destn, text: $text)
    }
`;


const UserChatScreen = () => {
    const location = useLocation();
    // const {
    //     chain_id,
    //     default_chain_id,
    //     application_id,
    //     username
    // } = location.state;

    const [adminAppGQLClient, setAdminAppGQLClient] = useState(graphqlClient(8080, null, null));
    const [userAppGQLClient, setUserAppGQLClient] = useState(graphqlClient(8080, null, null));
    const [recipientAppGQLClient, setRecipientAppGQLClient] = useState(graphqlClient(8080, null, null));
    const [defaultChainId, setDefaultChainId] = useState('');
    const [chainId, setChainId] = useState('');
    const [username, setUsername] = useState('');
    useEffect(() => {
        setAdminAppGQLClient(graphqlClient(8080, location.state.default_chain_id, location.state.application_id));
        setUserAppGQLClient(graphqlClient(8080, location.state.chain_id, location.state.application_id, SCHEMA_TYPEDEFS));
        setDefaultChainId(location.state.default_chain_id);
        setUsername(location.state.username)
        setChainId(location.state.chain_id)
    },
    [location]
    );

    // console.log(chain_id, default_chain_id, application_id, username);


    // component states
    const [inputMessage, setInputMessage] = useState('');
    const [recipientChainData, setRecipientChainData] = useState(null);
    const [existingChatsData, setExistingChatsData] = useState([]);
    const [otherChatsData, setOtherChatsData] = useState([]);
    const [userMessagesData, setUserMessagesData] = useState([]);
    const [recipientMessagesData, setRecipientMessagesData] = useState([]);


    // GraphQL queries

    // fetch exiting chats of user
    const { loading: existingChatsLoading, error: existingChatsError, data: existingChatsResponse } = useQuery(
        SEARCH_CHATS_QUERY,
        {
            client: adminAppGQLClient,
            variables: {
                count: 100
            },
            fetchPolicy: 'network-only',
            pollInterval: 15000
        },
    );

    // // fetch other chats available on server
    const { loading: otherChatsLoading, error: otherChatsError, data: otherChatsResponse } = useQuery(
        SEARCH_CHATS_QUERY,
        {
            client: userAppGQLClient,
            variables: {
                count: 100
            },
            fetchPolicy: 'network-only',
            pollInterval: 15000
        }
    );


    // send the first message to register the user
    const [sendInitMessageMutation, { sendInitMessageData, sendInitMessageLoading, sendInitMessageError }] = useMutation(
        SEND_MSG_MUTATION,
        {
            client: userAppGQLClient,
            // skip: !otherChatsResponse || !existingChatsResponse,
            variables: {
                text: 'Hi !!',
                destn: {
                    username: 'admin',
                    chain_id: defaultChainId
                }
            }
        }
    );
    
    // send the first message to register the user
    const [sendMessageMutation, { sendMessageData, sendMessageLoading, sendMessageError }] = useMutation(
        SEND_MSG_MUTATION,
        {
            client: userAppGQLClient
            // skip: !otherChatsResponse || !existingChatsResponse,
        }
    );


    // load existing chats

    useEffect(() => {
        if (!existingChatsLoading && !existingChatsError) {
            setExistingChatsData(existingChatsResponse.messagesKeys);
        }
    },
        // []
        [existingChatsLoading, existingChatsError, existingChatsResponse]
    );



    // load active chats
    useEffect(() => {
        if (!otherChatsLoading && !otherChatsError) {
            setOtherChatsData(otherChatsResponse.messagesKeys);
        }
    },
        // []
        [otherChatsLoading, otherChatsError, otherChatsResponse]
    );    



    // send the init registration message
    useEffect(() => {
        sendInitMessageMutation()
        .then((result) => {
            console.log('successfully sent hi', result);
        })
        .catch((error) => {
            console.log('error in sending hi', error);
        })
    },
    [sendInitMessageMutation]
    );


    const [fetchUserMessages, {fetchUserMessagesData, fetchUserMessagesLoading, fetchUserMessagesError}] = useLazyQuery(
        MESSAGES_QUERY,
        {
            client: userAppGQLClient,
            fetchPolicy: 'network-only'
        }
    );
    
    const [fetchRecipientMessages, {fetchRecipientMessagesData, fetchRecipientMessagesLoading}] = useLazyQuery(
        MESSAGES_QUERY,
        {
            client: recipientAppGQLClient,
            fetchPolicy: 'network-only'
        }
    );   

    useEffect(() => {
      const intervalId = setInterval(() => {
        if (recipientChainData !== null) {
            fetchUserMessages({
                variables: {
                    account: recipientChainData
                }
            })
            .then((result) => {
                console.log('user messages', result.data.messages);
                setUserMessagesData(result.data.messages);

                fetchRecipientMessages({
                    variables: {
                        account: {
                            username: username,
                            chain_id: chainId
                        }
                    }
                })
                .then((result) => {
                    console.log('recipient messages', result.data.messages)
                    setRecipientMessagesData(result.data.messages);
                })
                .catch((error) => {
                    console.error('error fetching recipient messages', error);
                })

            })
            .catch((error) => {
                console.error('error fetching user messages', error)
            })
        }
        
      }, 10000);
    
      return () => {
        clearInterval(intervalId);
      };
    }, [recipientChainData, chainId, username, fetchRecipientMessages, fetchUserMessages])
    
    
    const handleActiveChatLabelClick = (chat) => {
        // set recipient chain data
        setRecipientChainData(chat);
        setRecipientAppGQLClient(graphqlClient(8080, chat.chain_id, location.state.application_id));
        console.log('this is my main chat now', recipientChainData);
    } 

    const handleSendMessage = () => {
        // Send message mutation logic here
        console.log('before clicking', recipientChainData, inputMessage);
        userAppGQLClient
        .mutate({
            mutation: SEND_MSG_MUTATION,
            variables: {
                text: inputMessage,
                destn: {
                    username: recipientChainData?.username,
                    chain_id: recipientChainData?.chain_id
                },
            }
        })
        .then((result) => {
            console.log('successfully sent message', result);
        })
        .catch((error) => {
            console.error('error in sending message', error)
        })
        // sendMessageMutation({
        //     client: userAppGQLClient,
        //     variables: {
        //         text: inputMessage,
        //         destn: {
        //             username: recipientChainData.username,
        //             chain_id: recipientChainData.chain_id
        //         }
        //     }
        // })
        // .then((result) => {
        //     console.log('successfully sent message', result);
        // })
        // .catch((error) => {
        //     console.error('failed to send message', error);
        // })


    };

    return (
        <div>
            {
                existingChatsLoading || otherChatsLoading ? (
                    <div>
                    <p>Loading !!</p>
                    <p>{existingChatsLoading.toString()}</p>
                    <p>{otherChatsLoading.toString()}</p>
                    </div>
                ) : existingChatsError || otherChatsError ? (
                        <div>
                            <p>Error loading data</p>
                        </div>
                ) : (
                        
                <div className='UserChatBox'>
                    {/* <p>{otherChatsLoading.toString()}</p>
                    <p>{existingChatsLoading.toString()}</p> */}
                    <h1>User Chat Screen</h1>
                    <h2>{username}</h2>
                    {/* <div className='OtherChatsSideBar'>
                        <label>Num other users</label>
                        <p>{otherChatsData.toString()}</p>
                    </div> */}

                    <div className='ActiveChatsSideBar'>
                        {/* <label>Num Active Chats</label>
                        <p>{existingChatsData.length.toString()}</p> */}
                        <div className='ActiveChatsList'>
                            {
                                existingChatsData.map((activeChat, index) => {
                                    return <label className='ActiveChatsLabel' key={index} onClick={() => handleActiveChatLabelClick(activeChat)} > {activeChat.username}</label>
                                })
                            }
                        </div>
                    </div>

                    <div className='Messages'>
                        <label>Messages will come here</label>
                    </div>

                    <div className='MessageInputBox'>
                        <input id='messageinput' type='text' name='inputMessage' value={inputMessage} onChange={(e) => setInputMessage(e.target.value) } ></input>
                        <button id='send' onClick={handleSendMessage}>Send</button>
                    </div>
                </div>

                )

            }
        </div>
    );
};

export default UserChatScreen;
