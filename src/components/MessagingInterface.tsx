import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAuth } from '../contexts/AuthContext';

interface MessagingInterfaceProps {
  otherUserId: string;
  otherUserName: string;
  otherUserType: 'vendor' | 'supplier';
  orderId?: Id<'orders'>;
  onClose?: () => void;
}

export const MessagingInterface: React.FC<MessagingInterfaceProps> = ({
  otherUserId,
  otherUserName,
  otherUserType,
  orderId,
  onClose
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(api.messages.getConversation, { 
    userEmail: user?.email || '', 
    otherUserId 
  });
  const sendMessage = useMutation(api.messages.sendMessage);
  const markAsRead = useMutation(api.messages.markAsRead);
  const sendMessageNotification = useMutation(api.notifications.sendMessageNotification);

  useEffect(() => {
    if (messages && messages.length > 0 && user?.email) {
      markAsRead({ userEmail: user.email, senderId: otherUserId });
    }
  }, [messages, otherUserId, user?.email]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const messageId = await sendMessage({
        userEmail: user?.email || '',
        receiverId: otherUserId,
        receiverType: otherUserType,
        content: message.trim(),
        messageType: orderId ? 'order_inquiry' : 'text',
        orderId,
      });

      // Send notification
      await sendMessageNotification({ messageId });

      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const isCurrentUser = (senderId: string) => {
    // This would need to be implemented based on your auth system
    // For now, we'll assume messages from otherUserId are not from current user
    return senderId !== otherUserId;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">
              {otherUserName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{otherUserName}</h3>
            <p className="text-sm text-gray-500 capitalize">{otherUserType}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((msg: any) => (
          <div
            key={msg._id}
            className={`flex ${isCurrentUser(msg.senderId) ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isCurrentUser(msg.senderId)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
              <p
                className={`text-xs mt-1 ${
                  isCurrentUser(msg.senderId) ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {formatTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Conversations List Component
export const ConversationsList: React.FC<{
  onSelectConversation: (userId: string, userName: string, userType: 'vendor' | 'supplier') => void;
}> = ({ onSelectConversation }) => {
  const { user } = useAuth();
  const conversations = useQuery(api.messages.getConversations, { 
    userEmail: user?.email || '' 
  });

  if (!conversations) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conversation: any) => (
        <div
          key={conversation.partnerId}
          onClick={() => onSelectConversation(
            conversation.partnerId,
            conversation.partnerDetails?.businessName || 'Unknown',
            conversation.partnerType as 'vendor' | 'supplier'
          )}
          className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {(conversation.partnerDetails?.businessName || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              {conversation.unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-semibold">
                    {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {conversation.partnerDetails?.businessName || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(conversation.lastMessage.createdAt).toLocaleDateString()}
                </p>
              </div>
              <p className="text-sm text-gray-500 truncate">
                {conversation.lastMessage.content}
              </p>
              <p className="text-xs text-gray-400 capitalize">
                {conversation.partnerType}
              </p>
            </div>
          </div>
        </div>
      ))}
      {conversations.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>No conversations yet</p>
          <p className="text-sm">Start a conversation with a supplier or vendor</p>
        </div>
      )}
    </div>
  );
};
