import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import './App.css';

const App = () => {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('Python');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = { sender: 'user', text: message, language };
    setChat(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/autogen-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: `Generate ${language} code for: ${message}`,
          language 
        })
      });

      const data = await response.json();
      let botResponse = data.response;

      // Format code response
      if (botResponse.includes('```')) {
        const lang = language.toLowerCase();
        const codeContent = botResponse.replace(/```[a-zA-Z]*/g, '').replace(/```/g, '').trim();
        botResponse = (
          <div className="code-response">
            <pre className={`language-${lang}`}>
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }

      setChat(prev => [...prev, { sender: 'bot', text: botResponse }]);
    } catch (error) {
      console.error("API Error:", error);
      setChat(prev => [...prev, { 
        sender: 'bot', 
        text: "Failed to get response. Please check your connection and try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-app">
      <motion.div className="chat-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        AI Code Assistant 🤖
      </motion.div>

      <div className="language-selector">
        <label htmlFor="language">Programming Language:</label>
        <select 
          id="language" 
          value={language} 
          onChange={(e) => setLanguage(e.target.value)}
          disabled={loading}
        >
          <option value="Python">Python</option>
          <option value="JavaScript">JavaScript</option>
          <option value="Java">Java</option>
          <option value="C++">C++</option>
          <option value="TypeScript">TypeScript</option>
        </select>
      </div>

      <div className="messages-container">
        {chat.length === 0 && (
          <motion.div className="welcome-message" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <div className="message bot-message">
              <p>Hello! I'm your AI coding assistant.</p>
              <p>Ask me to generate code in any supported language.</p>
              <p>Example: "Show me how to implement quicksort in Python"</p>
            </div>
          </motion.div>
        )}

        {chat.map((msg, index) => (
          <motion.div 
            key={index} 
            className={`message ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {msg.sender === 'user' && <div className="message-language">{msg.language}</div>}
            {typeof msg.text === 'string' ? msg.text : msg.text}
          </motion.div>
        ))}

        {loading && (
          <div className="typing-indicator">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
            <span>Generating {language} code...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="message-input"
          placeholder={`Ask for ${language} code...`}
          disabled={loading}
        />
        <button 
          onClick={sendMessage} 
          className="send-button"
          disabled={loading || !message.trim()}
        >
          <Send className="send-icon" />
        </button>
      </div>
    </div>
  );
};

export default App;