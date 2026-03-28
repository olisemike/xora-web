// Utility functions for parsing hashtags and mentions

export const parseHashtags = (text) => {
  if (!text) return [];
  const hashtagRegex = /#(\w+)/g;
  const matches = text.matchAll(hashtagRegex);
  return Array.from(matches, match => match[1]);
};

export const parseMentions = (text) => {
  if (!text) return [];
  const mentionRegex = /@(\w+)/g;
  const matches = text.matchAll(mentionRegex);
  return Array.from(matches, match => match[1]);
};

export const renderTextWithHashtagsAndMentions = (text, onHashtagClick, onMentionClick) => {
  if (!text) return null;

  const combinedRegex = /(#\w+|@\w+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
        key: `text-${lastIndex}`
      });
    }

    const matched = match[0];
    if (matched.startsWith('#')) {
      parts.push({
        type: 'hashtag',
        content: matched,
        tag: matched.substring(1),
        key: `hashtag-${match.index}`,
        onClick: onHashtagClick
      });
    } else if (matched.startsWith('@')) {
      parts.push({
        type: 'mention',
        content: matched,
        username: matched.substring(1),
        key: `mention-${match.index}`,
        onClick: onMentionClick
      });
    }

    lastIndex = match.index + matched.length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
      key: `text-${lastIndex}`
    });
  }

  return parts;
};

export const detectHashtagAtCursor = (text, cursorPosition) => {
  const beforeCursor = text.substring(0, cursorPosition);
  const hashtagMatch = beforeCursor.match(/#(\w*)$/);
  
  if (hashtagMatch) {
    return {
      isHashtag: true,
      query: hashtagMatch[1],
      startIndex: cursorPosition - hashtagMatch[0].length
    };
  }
  
  return { isHashtag: false };
};

export const detectMentionAtCursor = (text, cursorPosition) => {
  const beforeCursor = text.substring(0, cursorPosition);
  const mentionMatch = beforeCursor.match(/@(\w*)$/);
  
  if (mentionMatch) {
    return {
      isMention: true,
      query: mentionMatch[1],
      startIndex: cursorPosition - mentionMatch[0].length
    };
  }
  
  return { isMention: false };
};



