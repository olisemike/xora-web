import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RichTextInput.css';

const RichTextInput = ({ 
  value, 
  onChange, 
  placeholder = "What's on your mind?",
  maxLength = 2000,
  showCount = true,
  multiline = true,
  autoFocus = false,
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionType, setSuggestionType] = useState(null); // 'mention' or 'hashtag'
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const _navigate = useNavigate();

  // In development, use '/api' to proxy through Vite (same-origin for cookies)
  // In production, use the actual API URL
  const API_URL = import.meta.env.PROD
    ? 'https://xora-workers-api-production.xorasocial.workers.dev'
    : '/api';
  const [trendingHashtags, setTrendingHashtags] = useState([]);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        const response = await fetch(`${API_URL}/analytics/trending?limit=25`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error?.message || `Failed to load trending hashtags: ${response.status}`);
        }
        const topics = data.data?.topics || [];
        const mapped = topics.map((t) => ({
          tag: (t.tag || t.hashtag || '').replace(/^#/, ''),
          count: t.recent_count ?? t.post_count ?? 0,
        }));
        setTrendingHashtags(mapped);
      } catch (err) {
        setTrendingHashtags([]);
      }
    };

    loadTrending();
  }, [API_URL]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const detectInput = async (text, position) => {
    const beforeCursor = text.substring(0, position);
    
    // Check for mention
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      if (query) {
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
            setSuggestionType('mention');
            setShowSuggestions(true);
            setSelectedIndex(0);
            return;
          }
        } catch (err) {
          // Ignore errors when fetching mentions
        }
      }
    }
    
    // Check for hashtag
    const hashtagMatch = beforeCursor.match(/#(\w*)$/);
    if (hashtagMatch) {
      const query = hashtagMatch[1].toLowerCase();
      const filtered = trendingHashtags.filter(item => 
        item.tag.toLowerCase().includes(query)
      );
      
      if (filtered.length > 0 || query.length === 0) {
        setSuggestions(filtered);
        setSuggestionType('hashtag');
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }
    }
    
    setShowSuggestions(false);
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    const newPosition = e.target.selectionStart;
    
    setCursorPosition(newPosition);
    onChange(newValue);
    
    detectInput(newValue, newPosition);
  };

  const insertSuggestion = (item) => {
    const input = inputRef.current;
    if (!input) return;

    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    
    const symbol = suggestionType === 'mention' ? '@' : '#';
    const symbolIndex = beforeCursor.lastIndexOf(symbol);
    const insertText = suggestionType === 'mention' ? item.username : item.tag;
    const newBefore = beforeCursor.substring(0, symbolIndex + 1) + insertText;
    const newValue = `${newBefore  } ${  afterCursor}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    
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
        if (!e.shiftKey && showSuggestions) {
          e.preventDefault();
          insertSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  };

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className={`rich-text-input-container ${className}`}>
      <div className="rich-text-input-wrapper">
        <InputComponent
          ref={inputRef}
          type={multiline ? undefined : "text"}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          className="rich-text-input"
          rows={multiline ? 4 : undefined}
          autoFocus={autoFocus}
        />
        
        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 ? <div className="rich-text-suggestions" ref={suggestionsRef}>
            {suggestionType === 'mention' && (
              <>
                {suggestions.map((user, index) => (
                  <div
                    key={user.id}
                    className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => insertSuggestion(user)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <img src={user.avatar} alt={user.name} className="suggestion-avatar" />
                    <div className="suggestion-info">
                      <div className="suggestion-name">{user.name}</div>
                      <div className="suggestion-username">@{user.username}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {suggestionType === 'hashtag' && (
              <>
                {suggestions.map((item, index) => (
                  <div
                    key={item.tag}
                    className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => insertSuggestion(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="suggestion-hashtag">#{item.tag}</div>
                    <div className="suggestion-count">
                      {item.count.toLocaleString()} posts
                    </div>
                  </div>
                ))}
              </>
            )}
          </div> : null}
      </div>

      <div className="rich-text-footer">
        <div className="rich-text-hints">
          <span className="hint-item">
            <span className="hint-symbol">@</span> Mention users
          </span>
          <span className="hint-item">
            <span className="hint-symbol">#</span> Add hashtags
          </span>
        </div>
        {showCount ? <div className="rich-text-char-count">
            {value.length} / {maxLength}
          </div> : null}
      </div>
    </div>
  );
};

export default RichTextInput;





