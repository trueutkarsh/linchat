import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomeScreen from './components/HomeScreen';
import UserChatScreen from './components/UserChatScreen';
import GroupChatScreen from './components/GroupChatScreen';
// import logo from './logo.svg';
import './App.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route exact path="/" element={<HomeScreen/>} />
        <Route path="/user-chat" element={<UserChatScreen/>} />
        <Route path="/group-chat" element={<GroupChatScreen/>} />
      </Routes>
    </Router>
  );
};

export default App;