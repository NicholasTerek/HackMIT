import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";

interface ChatMessage {
  id: string;
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
}

interface ChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestion: string;
  noteContext?: string;
}

export const ChatDialog = ({ isOpen, onClose, initialQuestion, noteContext }: ChatDialogProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reset messages and call API when dialog opens with new question
  useEffect(() => {
    if (isOpen && initialQuestion) {
      setMessages([
        {
          id: '1',
          type: 'question',
          content: initialQuestion,
          timestamp: new Date()
        }
      ]);
      setIsLoading(true);
      
      // Call the backend API with note context
      fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: initialQuestion,
          noteContext: noteContext || ''
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setMessages(prev => [
            ...prev,
            {
              id: '2',
              type: 'answer',
              content: data.answer,
              timestamp: new Date()
            }
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            {
              id: '2',
              type: 'answer',
              content: 'Sorry, I encountered an error processing your question. Please try again.',
              timestamp: new Date()
            }
          ]);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error calling chat API:', error);
        setMessages(prev => [
          ...prev,
          {
            id: '2',
            type: 'answer',
            content: 'Sorry, I encountered an error processing your question. Please try again.',
            timestamp: new Date()
          }
        ]);
        setIsLoading(false);
      });
    }
  }, [isOpen, initialQuestion, noteContext]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur effect */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" onClick={onClose} />
      
      {/* Chat Dialog - positioned to show question bubble moving up from search bar area */}
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-24">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">AI Assistant</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              aria-label="Close chat"
            >
              <X className="h-4 w-4 text-neutral-600" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'question' ? 'justify-end' : 'justify-start'} ${
                  message.type === 'question' 
                    ? 'animate-in slide-in-from-bottom-2 duration-500' 
                    : 'animate-in slide-in-from-left-2 duration-500'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.type === 'question'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start animate-in slide-in-from-left-2 duration-300">
                <div className="bg-neutral-100 rounded-2xl px-4 py-3 flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-600" />
                  <span className="text-neutral-600 text-sm">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatDialog;
