"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getConversations, getMessages, sendMessage, getAdminUsers } from '@/lib/api';
import { MessageSquare, X, Send, User, Plus, Loader2 } from 'lucide-react';
import styles from './ChatBot.module.css';
import { io } from 'socket.io-client';
import { APP_CONFIG } from '@/config/app.config';

interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  sender: {
    id: string;
    name: string;
    profileImage?: string;
  };
  createdAt: string;
}

interface Conversation {
  id: string;
  users: Array<{
    id: string;
    name: string;
    profileImage?: string;
  }>;
  messages?: Message[];
  updatedAt: string;
}

export default function ChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const activeConversationRef = useRef(activeConversation);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    if (isOpen && user?.token) {
      fetchConversations();

      // Initialize socket
      const socketUrl = APP_CONFIG.apiUrl || window.location.origin;
      socketRef.current = io(socketUrl);
      console.log('[ChatBot] Socket initialized connecting to:', socketUrl);

      socketRef.current.on('connect', () => {
        console.log('[ChatBot] Socket connected:', socketRef.current.id);
      });

      socketRef.current.on('new_message', (message: any) => {
        console.log('[ChatBot] Socket received new_message:', message);
        const currentActive = activeConversationRef.current;
        // If message belongs to active conversation, add it
        if (currentActive && message.conversationId === currentActive.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }
        
        // Refresh conversations to show latest message in list
        fetchConversations();
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [isOpen, user?.token]);

  useEffect(() => {
    if (activeConversation && user?.token) {
      fetchMessages(activeConversation.id);
      
      if (socketRef.current) {
        console.log('[ChatBot] Emitting join_conversation:', activeConversation.id);
        socketRef.current.emit('join_conversation', activeConversation.id);
      }
    }
  }, [activeConversation, user?.token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    if (!user?.token) return;
    setIsLoading(true);
    const res = await getConversations(user.token);
    if (res.success && res.data) {
      setConversations(res.data as Conversation[]);
    }
    setIsLoading(false);
  };

  const fetchMessages = async (conversationId: string, silent = false) => {
    if (!user?.token) return;
    if (!silent) setIsLoading(true);
    const res = await getMessages(conversationId, user.token);
    if (res.success && res.data) {
      const uniqueMessages = (res.data as Message[]).filter(
        (msg, index, self) => index === self.findIndex((m) => m.id === msg.id)
      );
      setMessages(uniqueMessages);
    }
    if (!silent) setIsLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || !user?.token || isSending) return;

    setIsSending(true);
    const res = await sendMessage(activeConversation.id, newMessage, user.token);
    if (res.success && res.data) {
      const newMsg = res.data as Message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setNewMessage('');
      fetchConversations(); // Update conversation list to show latest message
    }
    setIsSending(false);
  };

  const handleStartNewChat = async () => {
    if (!user?.token) return;
    setShowUserList(true);
    setIsLoading(true);
    const res = await getAdminUsers(user.token, 1, 100);
    console.log('[ChatBot] getAdminUsers response:', res);
    if (res.success && res.data) {
      // Filter out the current user
      setUsers(res.data.filter((u: any) => u.id !== user.id));
    }
    setIsLoading(false);
  };

  const handleSelectUser = async (selectedUser: any) => {
    if (!user?.token) return;
    // Check if conversation already exists
    const existingConv = conversations.find((conv) =>
      conv.users.some((u) => u.id === selectedUser.id)
    );

    if (existingConv) {
      setActiveConversation(existingConv);
      setShowUserList(false);
      return;
    }

    // Create new conversation
    setIsLoading(true);
    // Note: createConversation is not fully implemented in the backend helper yet,
    // let's assume it works or we might need to create it.
    // Wait, I added it to api.ts! Let's use it.
    const { createConversation: createConvApi } = await import('@/lib/api');
    const res = await createConvApi([selectedUser.id], user.token);
    if (res.success && res.data) {
      setConversations((prev) => [res.data as Conversation, ...prev]);
      setActiveConversation(res.data as Conversation);
      setShowUserList(false);
    }
    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      {/* Floating Button */}
      {!isOpen && (
        <button className={styles.floatingButton} onClick={() => setIsOpen(true)}>
          <MessageSquare size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={styles.chatWindow}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              {activeConversation ? (
                <>
                  <button className={styles.backButton} onClick={() => setActiveConversation(null)}>
                    &larr;
                  </button>
                  <span>
                    {activeConversation.users.find((u) => u.id !== user?.id)?.name || 'Chat'}
                  </span>
                </>
              ) : showUserList ? (
                <>
                  <button className={styles.backButton} onClick={() => setShowUserList(false)}>
                    &larr;
                  </button>
                  <span>New Chat</span>
                </>
              ) : (
                <span>Messages</span>
              )}
            </div>
            <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {isLoading && !messages.length && (
              <div className={styles.loading}>
                <Loader2 className={styles.spinner} size={24} />
              </div>
            )}

            {!activeConversation && !showUserList && (
              <>
                <div className={styles.conversationList}>
                  {conversations.length === 0 ? (
                    <div className={styles.emptyState}>No conversations yet</div>
                  ) : (
                    conversations.map((conv) => {
                      const otherUser = conv.users.find((u) => u.id !== user?.id);
                      return (
                        <div
                          key={conv.id}
                          className={styles.conversationItem}
                          onClick={() => setActiveConversation(conv)}
                        >
                          <div className={styles.avatar}>
                            {otherUser?.profileImage ? (
                              <img src={otherUser.profileImage} alt={otherUser.name} />
                            ) : (
                              <User size={20} />
                            )}
                          </div>
                          <div className={styles.convDetails}>
                            <div className={styles.convName}>{otherUser?.name || 'Unknown'}</div>
                            <div className={styles.convMessage}>
                              {conv.messages?.[0]?.content || 'Click to chat'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <button className={styles.newChatButton} onClick={handleStartNewChat}>
                  <Plus size={16} /> New Chat
                </button>
              </>
            )}

            {showUserList && (
              <div className={styles.userList}>
                {users.length === 0 ? (
                  <div className={styles.emptyState}>No other users found</div>
                ) : (
                  users.map((u) => (
                    <div
                      key={u.id}
                      className={styles.userItem}
                      onClick={() => handleSelectUser(u)}
                    >
                      <div className={styles.avatar}>
                        {u.profileImage ? (
                          <img src={u.profileImage} alt={u.name} />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div className={styles.userName}>{u.name}</div>
                      <div className={styles.userEmail}>{u.email}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeConversation && (
              <div className={styles.messageArea}>
                <div className={styles.messagesList}>
                  {messages.map((msg) => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`${styles.messageWrapper} ${isMine ? styles.mine : styles.theirs}`}
                      >
                        <div className={styles.messageContent}>
                          {msg.content}
                          <div className={styles.messageTime}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form className={styles.inputArea} onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isSending}
                  />
                  <button type="submit" disabled={isSending || !newMessage.trim()}>
                    {isSending ? <Loader2 className={styles.spinner} size={16} /> : <Send size={16} />}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
