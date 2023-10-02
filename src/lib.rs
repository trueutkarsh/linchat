use async_graphql::{scalar, Request, Response};
use linera_sdk::base::{ChainId, ContractAbi, ServiceAbi, Timestamp};
use serde::{Deserialize, Serialize};

pub const MAX_Q_SIZE: usize = 1000;

pub struct LinchatAbi;

impl ContractAbi for LinchatAbi {
    type Parameters = ();
    type InitializationArgument = String;
    type Operation = Operation;
    type Message = Message;
    type ApplicationCall = ();
    type SessionCall = ();
    type SessionState = ();
    type Response = ();
}

impl ServiceAbi for LinchatAbi {
    type Parameters = ();
    type Query = Request;
    type QueryResponse = Response;
}

/// Operation
#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    /// Send a message across chain
    Send { destination: Account, text: String },
    /// Change username of account
    ChangeUsername { destination: ChainId, name: String },
    /// Add more memebers to chat ownership
    AddMember {
        destination: ChainId,
        member: Account,
    },
    /// Make group chat
    SetGroupChatFlag {
        flag: bool
    }

}

/// Message
#[derive(Debug, Deserialize, Serialize)]
pub enum Message {
    /// Accept the message
    Ack { msg: ChatMessage },
    /// Change username message
    UsernameChange { name: String },
    /// Add member
    MemberAdd { member: Account },
}

scalar!(ChatMessage);

/// Struct message with timestamp and text value
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ChatMessage {
    /// timestamp associated with message
    pub timestamp: Timestamp,
    /// the content of message
    pub text: String,
    /// for simplification purposes
    pub account: Account,
}

scalar!(Account);

/// Struct owner with chain id, username information
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct Account {
    /// username
    pub username: String,
    /// chain id
    pub chain_id: ChainId,
}
