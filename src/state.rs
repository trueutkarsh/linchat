use std::collections::VecDeque;

use linchat::{Account, ChatMessage};
use linera_sdk::views::{MapView, SetView, ViewStorageContext};
use linera_views::views::{GraphQLView, RootView};

#[derive(RootView, GraphQLView)]
#[view(context = "ViewStorageContext")]
pub struct Linchat {
    // Owner of the chat account
    pub owner: SetView<Account>,
    // Incoming messages
    pub messages: MapView<Account, VecDeque<ChatMessage>>,
}
