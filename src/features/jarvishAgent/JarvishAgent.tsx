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
import { JarvishMemoryPanel } from './components/JarvishMemoryPanel';
import { GhostWriterPanel } from './components/GhostWriterPanel';
import {BLOCK_TYPES, ROLES} from '@/shared/jarvish.constants.ts'
// Types
import { MessageRole } from './types';

export const JarvishAgent: React.FC = () => {
  // Global/UI State not tied to a single domain
  const [searchTerm, setSearchTerm] = useState('');
  const [showFullConversation, setShowFullConversation] = useState(true);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'memory'>('chat');
  const [isGhostWriterVisible, setIsGhostWriterVisible] = useState(false);

  // Domain Hooks
  const { 
    googleToken, 
    loginWithGoogle, 
    logout, 
    authError, 
    setAuthError,
    checkAndRefreshToken
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
  } = useJarvishChat(currentSessionId, googleToken, checkAndRefreshToken);

  // Sync Error Messages
  useEffect(() => {
    if (authError) setErrorMessage(authError);
  }, [authError, setErrorMessage]);

  // --- Draft Management ---
  const latestDraft = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === ROLES.MODEL || msg.role === ROLES.AGENT || msg.role === ROLES.ASSISTANT) {
        // If content is an array of blocks, find the draft block
        if (Array.isArray(msg.content)) {
          const draftBlock = msg.content.find(b => b.type ===  BLOCK_TYPES.DRAFT);
          if (draftBlock) return draftBlock;
        } else if (typeof msg.content === 'string') {
          try {
            const content = msg.content.trim();
            if (content.startsWith('[') || content.startsWith('{')) {
              const blocks = JSON.parse(content);
              const draftBlock = Array.isArray(blocks) 
                ? blocks.find((b: any) => b.type === BLOCK_TYPES.DRAFT)
                : (blocks.type === BLOCK_TYPES.DRAFT ? blocks : null);
              if (draftBlock) return draftBlock;
            }
          } catch (e) { /* Not JSON */ }
        }
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (latestDraft && !isGhostWriterVisible) {
      setIsGhostWriterVisible(true);
    }
  }, [latestDraft, isGhostWriterVisible]);

  // --- Handlers ---

  const handleGhostAction = useCallback(async (action: string) => {
    if (!currentSessionId) return;
    const query = `[x-draft-action] User requested to '${action}' the current draft. Please update the draft accordingly.`;
    await sendMessage(currentSessionId, query);
  }, [currentSessionId, sendMessage]);

  const handleSelectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    clearMessages();
    loadSessionHistory(id);
    setShowFullConversation(false);
    setViewMode('chat');
    setIsGhostWriterVisible(false);
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
      setViewMode('chat');
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
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        {viewMode === 'memory' ? (
          
            <JarvishMemoryPanel />
          
        ) : (
          <>
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
              onSendMessage={sendMessage}
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
          </>
        )}

        <GhostWriterPanel 
          content={latestDraft?.content || ''}
          title={latestDraft?.title}
          isVisible={isGhostWriterVisible && !!latestDraft}
          onClose={() => setIsGhostWriterVisible(false)}
          onAction={handleGhostAction}
        />
      </div>
    </div>
  );
};

export default JarvishAgent;
