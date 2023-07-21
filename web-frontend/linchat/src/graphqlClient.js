import { ApolloClient, InMemoryCache } from '@apollo/client';

function graphqlClient(port, chainId, applicationId) {
    port = port | 8080;
    let uri = `http://localhost:${port}`;
    if (chainId !== null) {
        uri += `/chains/${chainId}`;
    }
    if (applicationId !== null) {
        uri += `/applications/${applicationId}`;
    }
    return new ApolloClient({
        uri,
        cache: new InMemoryCache(),
    });
}

export default graphqlClient;