#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use self::state::Linchat;
use async_graphql::{Request, Response, EmptySubscription, Schema, Object};
use async_trait::async_trait;
use linchat::{Account, Operation};
use linera_sdk::{base::WithServiceAbi, QueryContext, Service, ViewStateStorage};
use std::sync::Arc;
use thiserror::Error;

linera_sdk::service!(Linchat);

impl WithServiceAbi for Linchat {
    type Abi = linchat::LinchatAbi;
}

#[async_trait]
impl Service for Linchat {
    type Error = Error;
    type Storage = ViewStateStorage<Self>;

    async fn query_application(
        self: Arc<Self>,
        _context: &QueryContext,
        request: Request,
    ) -> Result<Response, Self::Error> {
        let schema = Schema::build(self.clone(), MutationRoot {}, EmptySubscription).finish();
        let response = schema.execute(request).await;
        Ok(response)    }
}


struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn send(&self, destn: Account, text: String) -> Vec<u8> {
        bcs::to_bytes(&Operation::Send { destination: destn, text }).unwrap()
    }
}


/// An error that can occur while querying the service.
#[derive(Debug, Error)]
pub enum Error {
    /// Invalid query argument; could not deserialize request.
    #[error("Invalid query argument; could not deserialize request")]
    InvalidQuery(#[from] serde_json::Error),
}
