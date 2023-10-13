import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, gql, useLazyQuery } from '@apollo/client';
import { useLocation } from 'react-router-dom';
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

const ADD_MEMBER_MUTATION=gql`
    mutation addMember($destn: ChainId!, $member: Account!){
        addMember(destn: $destn, member: $member)
    }
`;



const UserChatScreen = () => {
    const location = useLocation();

    // state variables from prev screen
    const [adminAppGQLClient, setAdminAppGQLClient] = useState(graphqlClient(8080, location.state.default_chain_id, location.state.application_id));
    const [userAppGQLClient, setUserAppGQLClient] = useState(graphqlClient(8080, location.state.chain_id, location.state.application_id));
    const [defaultChainId, setDefaultChainId] = useState(location.state.default_chain_id);
    const [chainId, setChainId] = useState(location.state.chain_id);
    const [username, setUsername] = useState(location.state.username);
    

    // component states
    const [inputMessage, setInputMessage] = useState('');
    const [recipientChainData, setRecipientChainData] = useState(null);
    const [existingChatsData, setExistingChatsData] = useState([]);
    const [userMessagesData, setUserMessagesData] = useState([]);
    const [groupChatMessagesData, setGroupChatMessagesData] = useState([])

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
            pollInterval: 1500
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
            client: userAppGQLClient
        }
    );
    
    // // send the first message to register the user
    // const [sendMessageMutation, { sendMessageData, sendMessageLoading, sendMessageError }] = useMutation(
    //     SEND_MSG_MUTATION,
    //     {
    //         client: userAppGQLClient
    //         // skip: !otherChatsResponse || !existingChatsResponse,
    //     }
    // );




    // load existing chats

    useEffect(() => {
        if (!existingChatsLoading && !existingChatsError) {
            setExistingChatsData(existingChatsResponse.messagesKeys);
        }
    },
        // []
        [existingChatsLoading, existingChatsError, existingChatsResponse]
    );


    // send the init registration message
    useEffect(() => {
        
        sendInitMessageMutation({
            client: userAppGQLClient,
            // skip: !existingChatsResponse,
            variables: {
                text: 'Hi !!',
                destn: {
                    username: 'admin',
                    chain_id: defaultChainId
                }
            }
        })
        .then((result) => {
            console.log('successfully sent hi', result);
        })
        .catch((error) => {
            console.log('error in sending hi', error);
        })
    },
        [userAppGQLClient, defaultChainId, sendInitMessageMutation]
        // []
    );


    const [fetchUserMessages, {fetchUserMessagesData, fetchUserMessagesLoading, fetchUserMessagesError}] = useLazyQuery(
        MESSAGES_QUERY,
        {
            client: userAppGQLClient,
            fetchPolicy: 'network-only'
        }
    );  

    useEffect(() => {
      const intervalId = setInterval(() => {
        if (recipientChainData !== null) {
            if (recipientChainData.username[0] !== '#') {
                fetchUserMessages({
                    client: userAppGQLClient,
                    variables: {
                        account: recipientChainData
                    }
                })
                .then((result) => {
                    console.log("user messages", result);
                    setUserMessagesData(result?.data?.messages || []);
    
                })
                .catch((error) => {
                    console.error('error fetching user messages', error)
                })
            } else {
                let groupChatClient = graphqlClient(8080, recipientChainData.chain_id, location.state.application_id);
                groupChatClient
                .query({
                    query: MESSAGES_QUERY,
                    variables: {
                        account: recipientChainData
                    },
                    fetchPolicy: 'network-only'
                })
                .then((result) => {
                    console.log('groupchat messages', result)
                    setGroupChatMessagesData(result.data.messages || [])

                })

            }
        }
        
      }, 1000);
    
      return () => {
        clearInterval(intervalId);
      };
    }, [recipientChainData, userAppGQLClient, chainId, username, fetchUserMessages, setUserMessagesData])
    
    
    const handleActiveChatLabelClick = (chat) => {

        console.log('clicked chat', chat)

        if (chat.username[0] === '#') {
            let groupChatClient = graphqlClient(8080, chat.chain_id, location.state.application_id);
            groupChatClient
            .mutate({
                mutation: ADD_MEMBER_MUTATION,
                variables: {
                    destn: chat.chain_id,
                    member: {
                        username: username,
                        chain_id: chainId
                    }
                }
            })
            .then((result) => {
                console.log('successfully added member to group', result, chat)
            })
            .catch((error) => {
                console.log('failed to add member to chat', error);
            })
        }

        // set recipient chain data
        setRecipientChainData(chat);
        setUserMessagesData([]);
    } 

    const handleSendMessage = async () => {
        // Send message mutation logic here
        await userAppGQLClient
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
        setInputMessage("");


    };
    
    
    let combinedMessagesData = [];
    if (recipientChainData !== null) {
        if (recipientChainData.username[0] === '#') {
            combinedMessagesData = [...groupChatMessagesData]
        } else {
            combinedMessagesData = [...userMessagesData]
        }
    }
    combinedMessagesData.sort((a, b) => {return a.timestamp - b.timestamp})

    return (
        <div>
            {
                existingChatsLoading ? (
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
                
                <div className='ChatsContainer'>
                        
                    <div className='UserChatBox'>
                        {/* <p>{otherChatsLoading.toString()}</p>
                        <p>{existingChatsLoading.toString()}</p> */}
                        <h1>User Chat Screen</h1>
                        <h2 style={{backgroundColor: 'lightblue'}}>{username}</h2>
                        <h2 style={{backgroundColor: 'lightcoral'}}>{recipientChainData?.username}</h2>
                        {/* <div className='OtherChatsSideBar'>
                            <label>Num other users</label>
                            <p>{otherChatsData.toString()}</p>
                        </div> */}

                        <div className='Messages'>
                            <label>Messages will come here</label>
                            <div >
                                <ul className='MessagesList' >
                                {
                                    combinedMessagesData.map((msg, index) => {
                                        if (msg.account.username === username) {
                                            return <li className='UserMessages' key={index}> <label className='UserLabel'>{msg.account.username} </label> <label className='MessageText'> {' -> ' + msg.text} </label> </li>
                                        } else if (msg.account.username[0] === '#') {
                                            return <li className='RecipientMessages' key={index}><label className='UserLabel'>{'admin'} </label> <label className='MessageText'> {' -> ' + msg.text} </label></li>
                                        } else {
                                            return <li className='RecipientMessages' key={index}><label className='UserLabel'>{msg.account.username} </label> <label className='MessageText'> {' -> ' + msg.text} </label></li>
                                        }
                                    })
                                }
                                </ul>
                            </div>

                        </div>

                        <div className='MessageInputBox'>
                            <input id='messageinput' type='text' name='inputMessage' value={inputMessage} onChange={(e) => setInputMessage(e.target.value) } ></input>
                            <button id='send' onClick={handleSendMessage}>Send</button>
                        </div>
                    </div>

                    <div className='ActiveChatsSideBar'>
                        <label>Active Chats</label>
                        <div className='ActiveChatsList'>
                            {
                                existingChatsData.map((activeChat, index) => {
                                    return <label className='ActiveChatsLabel' key={index} onClick={() => handleActiveChatLabelClick(activeChat)} > {activeChat.username}</label>
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

export default UserChatScreen;
