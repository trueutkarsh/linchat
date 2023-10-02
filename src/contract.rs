#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use self::state::Linchat;
use async_trait::async_trait;
use linchat::{Account, ChatMessage, Message, Operation, MAX_Q_SIZE};
use linera_sdk::{
    base::{SessionId, WithContractAbi},
    contract::system_api,
    ApplicationCallResult, CalleeContext, Contract, ExecutionResult, MessageContext,
    OperationContext, SessionCallResult, ViewStateStorage
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

                let chat_msg = ChatMessage {
                        timestamp: system_api::current_system_time(),
                        text,
                        account: self.owner.get(0).await.unwrap().unwrap(),
                };

                let msg = Message::Ack {
                    msg: chat_msg.clone()
                };

                if !*self.isgroupchat.get() {
                    // Not a group chat / Is a userchat add it to self q
                    self.add_msg_to_queue(chat_msg.clone(), &destination).await.unwrap();
                }

                Ok(ExecutionResult::default().with_message(destination.chain_id, msg))
            }
            Operation::ChangeUsername { destination, name } => {
                let msg = Message::UsernameChange { name };
                Ok(ExecutionResult::default().with_message(destination, msg))
            }
            Operation::AddMember {
                destination,
                member,
            } => {
                let msg = Message::MemberAdd { member };
                Ok(ExecutionResult::default().with_message(destination, msg))
            }
            Operation::SetGroupChatFlag { flag } => {
                self.isgroupchat.set(flag);
                Ok(ExecutionResult::default())
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
                if *self.isgroupchat.get() {
                    // add message to admin queue only if it is group chat
                    let admin: Account = self.owner.get(0).await.unwrap().unwrap();
                    self.add_msg_to_queue(msg.clone(), &admin).await.unwrap();
                } else {
                    self.add_msg_to_queue(msg.clone(), &msg.account).await.unwrap();
                }
                Ok(ExecutionResult::default())
            }
            Message::UsernameChange { name } => {
                // Allow change of username only once by admin
                if self.owner.count() == 0 {
                    let account = Account {
                        username: name,
                        chain_id: system_api::current_chain_id(),
                    };
                    self.owner.push(account);
                }
                Ok(ExecutionResult::default())
            }
            Message::MemberAdd { member } => {
                let mut found: bool = false;
                for i in 0..self.owner.count() {
                    if member == self.owner.get(i).await.unwrap().unwrap() {
                        found = true;
                        break;
                    }
                }
                if !found {
                    self.owner.push(member);
                }
                Ok(ExecutionResult::default())
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

impl Linchat {
    async fn add_msg_to_queue(
        &mut self,
        msg: ChatMessage,
        destination: &Account
    ) -> Result<(), Error> {
        let msg_q_result = self.messages.get_mut_or_default(&destination).await;
        match msg_q_result {
            Ok(msg_q) => {
                msg_q.push_back(msg);
                if msg_q.len() > MAX_Q_SIZE {
                    msg_q.pop_front();
                }
                Ok(())
            }
            _ => Err(Error::MessageNotAdded),
        }        
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

    /// Linchat application doesn't support any cross-application sessions.
    #[error("Linchat application doesn't support any application calls")]
    ApplicationCallsNotSupported,

    #[error("Cross chain message not processed")]
    MessageNotProcessed,

    #[error("Message not added to self queue")]
    MessageNotAdded,
}
