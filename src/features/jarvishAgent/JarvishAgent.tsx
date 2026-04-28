import React, { useState, useCallback, useEffect } from 'react';
import styles from './jarvish-agent.module.scss';

// Hooks
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useJarvishSessions } from './hooks/useJarvishSessions';
import { useJarvishChat } from './hooks/useJarvishChat';

// Components
import { JarvishSidebar } from './components/JarvishSidebar';
import { JarvishHeader } from './components/JarvishHeader';
import { JarvishChatArea } from './components/JarvishChatArea';
import { JarvishChatInput } from './components/JarvishChatInput';

export const JarvishAgent: React.FC = () => {
  // Global/UI State not tied to a single domain
  const [searchTerm, setSearchTerm] = useState('');
  const [showFullConversation, setShowFullConversation] = useState(true);
  const [showAllLogs, setShowAllLogs] = useState(false);

  // Domain Hooks
  const { 
    googleToken, 
    loginWithGoogle, 
    logout, 
    authError, 
    setAuthError 
  } = useGoogleAuth();

  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    isFetchingSessions,
    hasMore,
    fetchSessions,
    createNewSession,
    deleteSession,
    triggerSummary,
    isPolling
  } = useJarvishSessions(searchTerm);

  const {
    messages,
    input,
    setInput,
    status,
    statusMessage,
    statusLogs,
    currentStage,
    attachments,
    errorMessage,
    setErrorMessage,
    isReasoningVisible,
    setIsReasoningVisible,
    sendMessage,
    cancelRequest,
    addAttachment,
    removeAttachment,
    clearMessages,
    loadSessionHistory
  } = useJarvishChat(currentSessionId, googleToken);

  // Sync Error Messages
  useEffect(() => {
    if (authError) setErrorMessage(authError);
  }, [authError, setErrorMessage]);

  // --- Handlers ---

  const handleSelectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    clearMessages();
    loadSessionHistory(id);
    setShowFullConversation(false);
  }, [setCurrentSessionId, clearMessages, loadSessionHistory]);

  const handleCreateNewSession = useCallback(async () => {
    const newId = await createNewSession();
    if (newId) handleSelectSession(newId);
  }, [createNewSession, handleSelectSession]);

  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      // Auto-create session if none active
      const title = input.substring(0, 30) + (input.length > 30 ? '...' : '');
      sessionId = await createNewSession(title);
      if (sessionId) {
        setCurrentSessionId(sessionId);
      }
    }

    if (sessionId) {
      setShowFullConversation(true);
      sendMessage(sessionId);
    }
  }, [input, currentSessionId, createNewSession, setCurrentSessionId, sendMessage]);

  const handleResetUI = useCallback(() => {
    clearMessages();
    setErrorMessage(null);
    setAuthError(null);
  }, [clearMessages, setErrorMessage, setAuthError]);

  const handleCopyToInput = useCallback((text: string) => {
    setInput(text);
  }, [setInput]);

  return (
    <div className={styles.layout}>
      <JarvishSidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateNewSession}
        onDeleteSession={deleteSession}
        onTriggerSummary={triggerSummary}
        onLoadMore={() => fetchSessions(false)}
        hasMore={hasMore}
        isFetching={isFetchingSessions}
        isPollingSummary={isPolling}
      />

      <div className={styles.container}>
        <JarvishHeader 
          currentSessionId={currentSessionId}
          showFullConversation={showFullConversation}
          setShowFullConversation={setShowFullConversation}
          googleToken={googleToken}
          onLogin={loginWithGoogle}
          onLogout={logout}
          onResetUI={handleResetUI}
        />

        <JarvishChatArea 
          messages={messages}
          status={status}
          statusMessage={statusMessage}
          errorMessage={errorMessage}
          currentStage={currentStage}
          isReasoningVisible={isReasoningVisible}
          setIsReasoningVisible={setIsReasoningVisible}
          showFullConversation={showFullConversation}
          setShowFullConversation={setShowFullConversation}
          currentSessionId={currentSessionId}
          sessions={sessions}
          onCopyToInput={handleCopyToInput}
        />

        <JarvishChatInput 
          input={input}
          setInput={setInput}
          status={status}
          statusLogs={statusLogs}
          showAllLogs={showAllLogs}
          setShowAllLogs={setShowAllLogs}
          attachments={attachments}
          onFileUpload={addAttachment}
          onRemoveAttachment={removeAttachment}
          onSendMessage={handleSendMessage}
          onCancelRequest={cancelRequest}
          onClearInput={() => setInput('')}
        />
      </div>
    </div>
  );
};

export default JarvishAgent;
