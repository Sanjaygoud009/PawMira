import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { X, Send, UserRound } from 'lucide-react';
import api from '../../utils/api';
import { getSafeImageUrl } from '../../utils/imageUtils';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://127.0.0.1:5000';

export default function RescueChat({ reportId, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [socketError, setSocketError] = useState(null);
  const [roomReady, setRoomReady] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize Socket & Fetch History
  useEffect(() => {
    // 1. Fetch History
    const fetchHistory = async () => {
      try {
        const { data } = await api.get(`/rescue-messages/${reportId}`);
        setMessages(data);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();

    // 2. Setup Socket
    const token = localStorage.getItem('pawmira_token');
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      forceNew: true // Ensures a clean connection instance per chat session
    });

    const joinRoom = () => {
      console.log('Connected to socket:', socketRef.current.id);
      setSocketError(null);
      setRoomReady(false);
      socketRef.current.emit('join_rescue_room', reportId, (result) => {
        if (result?.ok) {
          setRoomReady(true);
        } else {
          setSocketError(result?.error || 'Could not join this rescue chat.');
        }
      });
    };

    if (socketRef.current.connected) {
      joinRoom();
    } else {
      socketRef.current.connect();
    }

    socketRef.current.on('connect', joinRoom);

    // Handle server-rejected connections (e.g., auth failure, invalid token)
    socketRef.current.on('connect_error', (err) => {
      console.error('[SOCKET_CONNECT_ERROR]', err.message);
      setSocketError(err.message || 'Could not connect to real-time chat.');
      setLoading(false);
    });

    socketRef.current.on('disconnect', () => {
      setRoomReady(false);
    });

    socketRef.current.on('receive_rescue_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_rescue_room', reportId);
        socketRef.current.disconnect();
      }
    };
  }, [reportId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current || socketError || !roomReady || !socketRef.current.connected) return;

    socketRef.current.emit('send_rescue_message', {
      reportId,
      content: newMessage.trim(),
    }, (result) => {
      if (result?.ok) {
        setNewMessage('');
      } else {
        setSocketError(result?.error || 'Could not send message.');
      }
    });
  };

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return createPortal(
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-dark/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      >
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="w-full sm:max-w-md h-[85vh] sm:h-[600px] bg-white rounded-t-3xl sm:rounded-3xl flex flex-col shadow-xl overflow-hidden border border-neutral"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-dark text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div>
              <h2 className="font-black text-lg">Rescue Chat</h2>
              <p className="text-xs font-medium text-white/80">Coordinate in real-time</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-4">
            {socketError ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <X size={20} className="text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-600">Real-time chat unavailable</p>
                  <p className="text-xs text-text-light mt-1">Could not connect to the chat server. Please close and try again.</p>
                </div>
              </div>
            ) : loading ? (
              <div className="flex justify-center items-center h-full text-text-light text-sm">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-text-light opacity-60">
                <div className="w-12 h-12 rounded-full bg-neutral flex items-center justify-center mb-3">
                  <UserRound size={20} />
                </div>
                <p className="text-sm">No messages yet.</p>
                <p className="text-xs">Start coordinating the rescue!</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.sender?._id === user._id;
                
                return (
                  <div key={msg._id || index} className={`flex gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && (
                      <img 
                        src={getSafeImageUrl(msg.sender?.profile_image_url)} 
                        alt={msg.sender?.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 mt-1 shadow-sm"
                        onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=User&background=E2E8F0&color=64748B' }}
                      />
                    )}
                    <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && <span className="text-[10px] font-bold text-text-light ml-1 mb-0.5">{msg.sender?.name}</span>}
                      <div 
                        className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                          isMe 
                            ? 'bg-primary text-white rounded-tr-sm' 
                            : 'bg-white text-dark border border-neutral rounded-tl-sm'
                        }`}
                        style={{ wordBreak: 'break-word' }}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[9px] font-medium text-text-light mt-1 mx-1">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-neutral shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder={socketError ? 'Chat unavailable' : roomReady ? 'Type your message...' : 'Joining chat...'}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="input flex-1 py-3 bg-neutral focus:bg-white"
                disabled={!!socketError || !roomReady}
                autoFocus={!socketError && roomReady}
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim() || !!socketError || !roomReady}
                className="bg-primary text-white p-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
