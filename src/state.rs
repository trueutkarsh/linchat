use std::collections::VecDeque;

use linchat::{Account, ChatMessage};
use linera_sdk::views::{LogView, MapView, ViewStorageContext};
use linera_views::views::{GraphQLView, RootView};

#[derive(RootView, GraphQLView)]
#[view(context = "ViewStorageContext")]
pub struct Linchat {
    // Owner of the chat account
    pub owner: LogView<Account>,
    // Incoming messages
    pub messages: MapView<Account, VecDeque<ChatMessage>>,
}
