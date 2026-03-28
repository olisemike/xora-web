import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RichText.css';

const RichText = ({ text, className = '' }) => {
  const navigate = useNavigate();

  if (!text) return null;

  const parseText = () => {
    // Combined regex for mentions and hashtags
    const combinedRegex = /(@\w+|#\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index),
          key: `text-${lastIndex}`
        });
      }

      // Add mention or hashtag
      const matched = match[0];
      if (matched.startsWith('@')) {
        parts.push({
          type: 'mention',
          content: matched,
          username: matched.substring(1),
          key: `mention-${match.index}`
        });
      } else if (matched.startsWith('#')) {
        parts.push({
          type: 'hashtag',
          content: matched,
          tag: matched.substring(1),
          key: `hashtag-${match.index}`
        });
      }

      lastIndex = match.index + matched.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex),
        key: `text-${lastIndex}`
      });
    }

    return parts;
  };

  const handleMentionClick = (username) => {
    // Navigate to user profile
    navigate(`/profile/${username}`);
  };

  const handleHashtagClick = (tag) => {
    // Navigate to hashtag page
    navigate(`/hashtag/${tag}`);
  };

  const parts = parseText();

  return (
    <div className={`rich-text ${className}`}>
      {parts.map((part) => {
        switch (part.type) {
          case 'mention':
            return (
              <span
                key={part.key}
                className="rich-text-mention"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMentionClick(part.username);
                }}
              >
                {part.content}
              </span>
            );
          case 'hashtag':
            return (
              <span
                key={part.key}
                className="rich-text-hashtag"
                onClick={(e) => {
                  e.stopPropagation();
                  handleHashtagClick(part.tag);
                }}
              >
                {part.content}
              </span>
            );
          default:
            return <span key={part.key}>{part.content}</span>;
        }
      })}
    </div>
  );
};

export default RichText;





