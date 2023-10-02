import { gql, useQuery } from '@apollo/client';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import graphqlClient from '../graphqlClient';
import './HomeScreen.css';

const DEFAULT_CHAIN_QUERY=gql`
    query {
        chains {
            default
        }
    }
`;

const APPLICATION_ID_QUERY=gql`
    query applications($chain_id: ChainId!) {
        applications(chainId: $chain_id) {
            id,
        }
    }
`;

const DEFAULT_CHAIN_PUBLIC_KEY_QUERY=gql`
    query chain($chain_id: ChainId!){
        chain(chainId: $chain_id) {
            manager
        }
    }
`;


const OPEN_CHAT_MUTATION=gql`
    mutation openChain($chain_id: ChainId!, $public_key: String!){
        openChain(chainId: $chain_id, publicKey: $public_key)
    }
`;

const CHANGE_USERNAME_MUTATION=gql`
    mutation changeUsername($chain_id: ChainId!, $name: String!) {
        changeUsername(destn: $chain_id, name: $name)
    }
`;

const defaultGQLClient = graphqlClient(8080, null, null);
let appGQLClient;


const HomeScreen = () => {

    
    
    // component states
    const [defaultChainData, setDefaultChainData] = useState(null);
    const [applicationIdData, setapplicationIdData] = useState(null);
    const [defaultChainPublicKeyData, setdefaultChainPublicKeyData] = useState(null);
    const [username, setUsername] = useState('');
    const [groupChatName, setGroupChatName] = useState('');
    

    // graphql queries
    const {loading: defaultChainLoading, error: defaultChainError, data: defaultChainResponse} = useQuery (
        DEFAULT_CHAIN_QUERY,
        {
            client: defaultGQLClient
        }
    );

    const {loading: applicationIdLoading, error: applicationIdError, data: applicationIdResponse} = useQuery (
        APPLICATION_ID_QUERY,
        {
            client: defaultGQLClient,
            skip: !defaultChainResponse,
            variables: {
                chain_id: defaultChainResponse?.chains.default
            }
        }
    );

    const {loading: defaultChainPublicKeyLoading, error: defaultChainPublicKeyError, data: defaultChainPublicKeyResponse} = useQuery (
        DEFAULT_CHAIN_PUBLIC_KEY_QUERY,
        {
            client: defaultGQLClient,
            skip: !defaultChainResponse,
            variables: {
                chain_id: defaultChainResponse?.chains.default
            }
        }
    );


    useEffect(() => {
        if (!defaultChainLoading && !defaultChainError) {
            // Update the state with the result of the defaultChain query
            setDefaultChainData(defaultChainResponse);
        }
    }, 
    [defaultChainLoading, defaultChainError, defaultChainResponse]
    );

    useEffect(() => {
        if (!applicationIdLoading && !applicationIdError) {
            // Update the state with the result of the applicationId query
            setapplicationIdData(applicationIdResponse);
            appGQLClient = graphqlClient(
                8080,
                defaultChainData?.chains.default,
                applicationIdResponse?.applications[0].id
            );            
        }
    },
    [applicationIdLoading, applicationIdError, applicationIdResponse, defaultChainData]
    );
    
    useEffect(() => {
        if (!defaultChainPublicKeyLoading && !defaultChainPublicKeyError) {
            // Update the state with the result of the defaultChainPublicKey query
            setdefaultChainPublicKeyData(defaultChainPublicKeyResponse);
        }
    },
    [defaultChainPublicKeyLoading, defaultChainPublicKeyError, defaultChainPublicKeyResponse]
    );

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        // Update the corresponding state based on the input field name
        if (name === 'username') {
            setUsername(value);
        } else if (name === 'groupChatName') {
            setGroupChatName(value);
        }
    };



    const navigate = useNavigate();

    const handleBeginClick = (event) => {
        // Open pop-up box of confirm
        // Your implementation here
        console.log(defaultChainData);
        console.log(applicationIdData);
        console.log(defaultChainPublicKeyData);
        console.log(appGQLClient);

        if (username === '' && groupChatName === '') {
            alert('Please enter atleast one field');
        } else if (username !== '' && groupChatName !== '') {
            alert('You can start only type of chat at a time. Please clear one of the fields');
        } else {
            event.preventDefault();
            defaultGQLClient
            .mutate({
                mutation: OPEN_CHAT_MUTATION,
                variables: {
                    chain_id: defaultChainData?.chains.default,
                    public_key: defaultChainPublicKeyData?.chain.manager.Single.public_key
                }
            })
            .then((newchainresult) => {
                console.log(`new chain`, newchainresult.data.openChain);
                appGQLClient
                .mutate({
                    mutation: CHANGE_USERNAME_MUTATION,
                    variables: {
                        chain_id: newchainresult?.data.openChain,
                        name: username || '#' + groupChatName
                    }
                })
                .then((changenameresult) => {
                    console.log(`changed name successfully`, changenameresult);
                    if (username) {
                        navigate('/user-chat', {
                            state : {
                                'chain_id': newchainresult.data.openChain,
                                'default_chain_id': defaultChainData?.chains.default,
                                'application_id': applicationIdData?.applications[0].id,
                                'username': username
                            }
                        })
                    } else {
                        navigate('/group-chat', {
                            state : {
                                'chain_id': newchainresult.data.openChain,
                                'default_chain_id': defaultChainData?.chains.default,
                                'application_id': applicationIdData?.applications[0].id,
                                'groupChatName': '#' + groupChatName
                            }
                        })

                    }
                })
                .catch((error) => {
                    console.error('couldnt change name error', error);
                })

            })
            .catch((error) => {
                console.error('Query error:', error);
            });
        }

    };

    return (
        <div>
        {
            defaultChainLoading || applicationIdLoading ? (
                <p>Loading</p>
            ) : defaultChainError || applicationIdError ? (
                <div>

                <p>Error loading data</p>
                {/* <p>{defaultChainData.chains.default}</p>
                <p>{applicationIdError?.message}</p>
                <p>{defaultChainError?.graphQLErrors.join(" ")}</p>
                <p>{applicationIdError?.graphQLErrors.join(" ")}</p> */}
                </div>
            ) : (
                <div className='init-chat-box'>
                    <div className='name-inputs' style={{ display: 'flex', flexDirection: 'row', alignItems: 'bottom' }}>
                        <div>
                            <label htmlFor="join-user-input">Join as user:</label>
                            <input type="text" id="join-user-input" name='username' value={username} onChange={handleInputChange}/>
                        </div>
                        <div>
                            <label htmlFor="start-group-input">Start a group chat:</label>
                            <input type="text" id="start-group-input" name='groupChatName' value={groupChatName} onChange={handleInputChange} />
                        </div>
                    </div>
                    <button className='begin' onClick={handleBeginClick}>Begin</button>
                </div>
            )
        }
        </div>
    );
};

export default HomeScreen;
