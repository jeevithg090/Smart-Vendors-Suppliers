import React, { useState } from 'react';
import { MessagingInterface, ConversationsList } from './MessagingInterface';
import { NotificationCenter, NotificationBell } from './NotificationCenter';
import { SupportChat } from './SupportChat';
import { DisputeResolution } from './DisputeResolution';

export const CommunicationHub: React.FC = () => {
  const [activeView, setActiveView] = useState<'conversations' | 'messaging' | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<{
    userId: string;
    userName: string;
    userType: 'vendor' | 'supplier';
  } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showDisputes, setShowDisputes] = useState(false);

  const handleSelectConversation = (userId: string, userName: string, userType: 'vendor' | 'supplier') => {
    setSelectedConversation({ userId, userName, userType });
    setActiveView('messaging');
  };

  const handleCloseMessaging = () => {
    setSelectedConversation(null);
    setActiveView('conversations');
  };

  return (
    <>
      {/* Communication Toolbar */}
      <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-40">
        {/* Notifications */}
        <div className="bg-white rounded-full shadow-lg">
          <NotificationBell onClick={() => setShowNotifications(true)} />
        </div>

        {/* Messages */}
        <button
          onClick={() => setActiveView(activeView === 'conversations' ? null : 'conversations')}
          className="p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
          title="Messages"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>

        {/* Support */}
        <button
          onClick={() => setShowSupport(true)}
          className="p-3 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors"
          title="Support"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>

        {/* Disputes */}
        <button
          onClick={() => setShowDisputes(true)}
          className="p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
          title="Disputes"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </button>
      </div>

      {/* Conversations Panel */}
      {activeView === 'conversations' && (
        <div className="fixed bottom-20 right-4 w-80 h-96 bg-white rounded-lg shadow-xl z-30">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Messages</h3>
            <button
              onClick={() => setActiveView(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="h-80 overflow-y-auto">
            <ConversationsList onSelectConversation={handleSelectConversation} />
          </div>
        </div>
      )}

      {/* Messaging Interface */}
      {activeView === 'messaging' && selectedConversation && (
        <div className="fixed bottom-20 right-4 w-96 h-[500px] z-30">
          <MessagingInterface
            otherUserId={selectedConversation.userId}
            otherUserName={selectedConversation.userName}
            otherUserType={selectedConversation.userType}
            onClose={handleCloseMessaging}
          />
        </div>
      )}

      {/* Notification Center */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Support Chat */}
      <SupportChat
        isOpen={showSupport}
        onClose={() => setShowSupport(false)}
      />

      {/* Dispute Resolution */}
      <DisputeResolution
        isOpen={showDisputes}
        onClose={() => setShowDisputes(false)}
      />
    </>
  );
};

// Quick Message Component for inline messaging
export const QuickMessage: React.FC<{
  recipientId: string;
  recipientName: string;
  recipientType: 'vendor' | 'supplier';
  orderId?: string;
  trigger: React.ReactNode;
}> = ({ recipientId, recipientName, recipientType, orderId, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-96 h-[500px]">
            <MessagingInterface
              otherUserId={recipientId}
              otherUserName={recipientName}
              otherUserType={recipientType}
              orderId={orderId as any}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};