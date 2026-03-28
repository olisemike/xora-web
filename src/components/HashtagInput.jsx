import React, { useState, useRef, useEffect } from 'react';
import './HashtagInput.css';

const HashtagInput = ({ 
  value, 
  onChange, 
  placeholder = "What's on your mind?",
  maxLength = 2000,
  showCount = true,
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Trending/Popular hashtags (would come from backend)
  const trendingHashtags = [
    { tag: 'trending', count: 1234 },
    { tag: 'viral', count: 987 },
    { tag: 'photography', count: 856 },
    { tag: 'travel', count: 742 },
    { tag: 'food', count: 698 },
    { tag: 'fitness', count: 567 },
    { tag: 'tech', count: 543 },
    { tag: 'art', count: 489 },
    { tag: 'music', count: 432 },
    { tag: 'fashion', count: 398 },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const detectHashtag = (text, position) => {
    // Find the word at cursor position
    const beforeCursor = text.substring(0, position);
    const _afterCursor = text.substring(position);
    
    // Check if we're typing a hashtag
    const hashtagMatch = beforeCursor.match(/#(\w*)$/);
    
    if (hashtagMatch) {
      const query = hashtagMatch[1].toLowerCase();
      
      // Filter trending hashtags based on query
      const filtered = trendingHashtags.filter(item => 
        item.tag.toLowerCase().includes(query)
      ).slice(0, 5);
      
      if (filtered.length > 0 || query.length === 0) {
        setSuggestions(filtered);
        setShowSuggestions(true);
        return true;
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
    
    detectHashtag(newValue, newPosition);
  };

  const insertHashtag = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    
    // Replace the partial hashtag with the complete one
    const hashtagStart = beforeCursor.lastIndexOf('#');
    const newBefore = beforeCursor.substring(0, hashtagStart + 1) + tag;
    const newValue = `${newBefore  } ${  afterCursor}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    
    // Set cursor after the inserted hashtag
    setTimeout(() => {
      textarea.focus();
      const newPosition = newBefore.length + 1;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      insertHashtag(suggestions[0].tag);
    }
  };

  const _parseTextWithHashtags = (text) => {
    if (!text) return null;
    
    const hashtagRegex = /#(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = hashtagRegex.exec(text)) !== null) {
      // Add text before hashtag
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Add hashtag
      parts.push(
        <span key={`hashtag-${match.index}`} className="hashtag-highlight">
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <div className={`hashtag-input-container ${className}`}>
      <div className="hashtag-input-wrapper">
        <textarea
          ref={textareaRef}
          id="hashtag-input"
          name="hashtagInput"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          className="hashtag-textarea"
          rows={4}
        />
        
        {/* Hashtag Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 ? <div className="hashtag-suggestions" ref={suggestionsRef}>
            <div className="hashtag-suggestions-header">
              Suggested Hashtags
            </div>
            {suggestions.map((item, _index) => (
              <div
                key={item.tag}
                className="hashtag-suggestion-item"
                onClick={() => insertHashtag(item.tag)}
              >
                <span className="hashtag-suggestion-tag">#{item.tag}</span>
                <span className="hashtag-suggestion-count">
                  {item.count.toLocaleString()} posts
                </span>
              </div>
            ))}
          </div> : null}
      </div>

      {/* Character Count */}
      {showCount ? <div className="hashtag-char-count">
          {value.length} / {maxLength}
        </div> : null}

      {/* Helper Text */}
      <div className="hashtag-helper-text">
        <span className="hashtag-highlight">#hashtags</span> will be clickable and searchable
      </div>
    </div>
  );
};

export default HashtagInput;





