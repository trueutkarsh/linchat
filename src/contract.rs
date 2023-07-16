#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use self::state::Linchat;
use async_trait::async_trait;
use linchat::{Account, ChatMessage, Message, Operation, MAX_Q_SIZE};
use linera_sdk::{
    base::{SessionId, WithContractAbi},
    contract::system_api,
    ApplicationCallResult, CalleeContext, Contract, ExecutionResult, MessageContext,
    OperationContext, SessionCallResult, ViewStateStorage,
};
use thiserror::Error;

linera_sdk::contract!(Linchat);

impl WithContractAbi for Linchat {
    type Abi = linchat::LinchatAbi;
}

#[async_trait]
impl Contract for Linchat {
    type Error = Error;
    type Storage = ViewStateStorage<Self>;

    async fn initialize(
        &mut self,
        _context: &OperationContext,
        username: String,
    ) -> Result<ExecutionResult<Self::Message>, Self::Error> {
        let account = Account {
            username,
            chain_id: system_api::current_chain_id(),
        };
        self.owner.push(account);
        Ok(ExecutionResult::default())
    }

    async fn execute_operation(
        &mut self,
        _context: &OperationContext,
        operation: Self::Operation,
    ) -> Result<ExecutionResult<Self::Message>, Self::Error> {
        match operation {
            Operation::Send { destination, text } => {
                let msg = Message::Ack {
                    msg: ChatMessage {
                        timestamp: system_api::current_system_time(),
                        text,
                        account: self.owner.get(0).await.unwrap().unwrap(),
                    },
                };
                Ok(ExecutionResult::default().with_message(destination.chain_id, msg))
            }
        }
    }

    async fn execute_message(
        &mut self,
        _context: &MessageContext,
        message: Self::Message,
    ) -> Result<ExecutionResult<Self::Message>, Self::Error> {
        match message {
            Message::Ack { msg } => {
                let msg_q_result = self.messages.get_mut_or_default(&msg.account).await;
                match msg_q_result {
                    Ok(msg_q) => {
                        msg_q.push_back(msg);
                        if msg_q.len() > MAX_Q_SIZE {
                            msg_q.pop_front();
                        }
                        Ok(ExecutionResult::default())
                    }
                    _ => Err(Error::MessageNotProcessed),
                }
            }
        }
    }

    async fn handle_application_call(
        &mut self,
        _context: &CalleeContext,
        _call: Self::ApplicationCall,
        _forwarded_sessions: Vec<SessionId>,
    ) -> Result<ApplicationCallResult<Self::Message, Self::Response, Self::SessionState>, Self::Error>
    {
        Err(Error::ApplicationCallsNotSupported)
    }

    async fn handle_session_call(
        &mut self,
        _context: &CalleeContext,
        _session: Self::SessionState,
        _call: Self::SessionCall,
        _forwarded_sessions: Vec<SessionId>,
    ) -> Result<SessionCallResult<Self::Message, Self::Response, Self::SessionState>, Self::Error>
    {
        Err(Error::SessionsNotSupported)
    }
}

/// An error that can occur during the contract execution.
#[derive(Debug, Error)]
pub enum Error {
    /// Failed to deserialize BCS bytes
    #[error("Failed to deserialize BCS bytes")]
    BcsError(#[from] bcs::Error),

    /// Failed to deserialize JSON string
    #[error("Failed to deserialize JSON string")]
    JsonError(#[from] serde_json::Error),

    /// Linchat application doesn't support any cross-application sessions.
    #[error("Linchat application doesn't support any cross-application sessions")]
    SessionsNotSupported,

    /// Social application doesn't support any cross-application sessions.
    #[error("Social application doesn't support any application calls")]
    ApplicationCallsNotSupported,

    #[error("Message not processed")]
    MessageNotProcessed,
}
