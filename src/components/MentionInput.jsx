import React, { useState, useRef, useEffect } from 'react';
import './MentionInput.css';

const MentionInput = ({ 
  value, 
  onChange, 
  placeholder = "Add a comment...",
  maxLength = 500,
  showCount = false,
  className = '',
  autoFocus = false
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // In development, use '/api' to proxy through Vite (same-origin for cookies)
  // In production, use the actual API URL
  const API_URL = import.meta.env.PROD
    ? 'https://xora-workers-api-production.xorasocial.workers.dev'
    : '/api';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const detectMention = async (text, position) => {
    const beforeCursor = text.substring(0, position);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      if (!query) {
        setShowSuggestions(false);
        return false;
      }

      try {
        const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}&type=users&limit=5`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error?.message || `Search failed with status ${response.status}`);
        }

        const users = data.data?.users || [];
        const mapped = users.map((u) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          avatar: u.avatar_url || null,
        }));

        if (mapped.length > 0) {
          setSuggestions(mapped);
          setShowSuggestions(true);
          setSelectedIndex(0);
          return true;
        }
      } catch (err) {
        // Ignore errors
      }
    }
    
    setShowSuggestions(false);
    return false;
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    const newPosition = e.target.selectionStart;
    
    setCursorPosition(newPosition);
    onChange(newValue);
    
    detectMention(newValue, newPosition);
  };

  const insertMention = (user) => {
    const input = inputRef.current;
    if (!input) return;

    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    
    // Replace the partial mention with the complete username
    const mentionStart = beforeCursor.lastIndexOf('@');
    const newBefore = beforeCursor.substring(0, mentionStart + 1) + user.username;
    const newValue = `${newBefore  } ${  afterCursor}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    
    // Set cursor after the inserted mention
    setTimeout(() => {
      input.focus();
      const newPosition = newBefore.length + 1;
      input.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        if (!e.shiftKey) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className={`mention-input-container ${className}`}>
      <div className="mention-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          className="mention-input"
        />
        
        {/* Mention Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 ? <div className="mention-suggestions" ref={suggestionsRef}>
            {suggestions.map((user, index) => (
              <div
                key={user.id}
                className={`mention-suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => insertMention(user)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="mention-avatar"
                />
                <div className="mention-user-info">
                  <div className="mention-name">{user.name}</div>
                  <div className="mention-username">@{user.username}</div>
                </div>
              </div>
            ))}
          </div> : null}
      </div>

      {showCount ? <div className="mention-char-count">
          {value.length} / {maxLength}
        </div> : null}
    </div>
  );
};

export default MentionInput;





