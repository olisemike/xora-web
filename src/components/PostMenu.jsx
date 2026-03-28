import React, { useState } from 'react';
import { IoClose, IoTrashOutline, IoFlagOutline, IoBanOutline, IoLinkOutline } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { useBlockList } from '../contexts/BlockContext';
import api from '../services/api';
import './PostMenu.css';
import { useToast } from './Toast';

function PostMenu({ visible, onClose, post, onDelete, onReport, onEdit }) {
  const { user, getCurrentUserId } = useAuth();
  const { isBlocked, block, unblock } = useBlockList();
  const toast = useToast();
  const [showReportCategories, setShowReportCategories] = useState(false);

  const getBasePostId = () => {
    if (!post) return null;
    if (post.original && post.original.id) {
      return post.original.id;
    }
    return post.id;
  };

  if (!visible || !post) return null;

  // Determine if the current user owns this post
  const isOwnPost = () => {
    if (!post) return false;

    // Get all possible post actor IDs (handle different field names from API)
    const postActorId = String(post.actor_id || post.actorId || post.user?.id || post.author?.id || '').trim();
    const postActorType = post.actor_type || post.actorType || 'user';

    // Get current user ID from multiple sources
    const currentUserId = String(getCurrentUserId() || user?.id || '').trim();

    // Check if the current user is the post author (as user)
    if (postActorType === 'user' && currentUserId && postActorId) {
      if (postActorId === currentUserId) {
        return true;
      }
      // Also check without prefix in case of ID format mismatch (user_xxx vs xxx)
      const normalizedPostId = postActorId.replace(/^user_/, '');
      const normalizedUserId = currentUserId.replace(/^user_/, '');
      if (normalizedPostId === normalizedUserId) {
        return true;
      }
    }

    // Check if active identity matches (for pages or user identity switching)
    const activeId = String(getCurrentUserId() || '').trim();
    const activeType = 'user';

    if (postActorType === activeType && postActorId && activeId) {
        if (postActorId === activeId) {
          return true;
        }
        // Handle ID format variations (user_xxx, page_xxx vs xxx)
        const normalizedPostId = postActorId.replace(/^(user_|page_)/, '');
        const normalizedActiveId = activeId.replace(/^(user_|page_)/, '');
        if (normalizedPostId === normalizedActiveId) {
          return true;
        }
    }

    return false;
  };

  const submitReport = async (category) => {
    try {
      const basePostId = getBasePostId();
      if (!basePostId) return;
      await api.reportContent('post', basePostId, category, '');
      toast.success('Report submitted. Our moderation team will review it soon.');
      onClose();
      if (onReport) onReport();
    } catch (error) {
      toast.error(error.message || 'Failed to submit report');
    }
  };

  const handleDelete = async () => {
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm('Are you sure you want to delete this post? This action cannot be undone.');
    if (!confirmed) return;

    const basePostId = getBasePostId();
    if (!basePostId) return;

    try {
      await api.deletePost(basePostId);
      toast.success('Post deleted successfully');
      onClose();
      if (onDelete) onDelete(basePostId);
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error(error.message || 'Failed to delete post');
    }
  };

  const handleReport = (category) => {
    submitReport(category);
    setShowReportCategories(false);
  };

  const handleCopyLink = () => {
    const basePostId = getBasePostId();
    if (!basePostId) return;
    const link = `${window.location.origin}/post/${basePostId}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Link copied to clipboard');
      onClose();
      return undefined;
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const isAuthorBlocked = post?.actor_type && post?.actor_id
    ? isBlocked(post.actor_type, post.actor_id)
    : false;

  const handleBlockAuthor = async () => {
    if (!post) return;
    const name = post.author?.name || 'this user';

    const entity = {
      id: post.actor_id,
      type: post.actor_type,
      name,
      username: post.author?.username,
      avatar: post.author?.avatar || null,
    };

    try {
      if (isAuthorBlocked) {
        await unblock(entity.type, entity.id);
        toast.success('User unblocked');
      } else {
        await block(entity);
        toast.success('User blocked successfully');
      }
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to update block status');
    }
  };

  const ownPost = isOwnPost();

  return (
    <>
      <div className="post-menu-overlay" onClick={onClose} />
      <div className="post-menu">
        <div className="post-menu-header">
          <h3>Post Options</h3>
          <button className="post-menu-close" onClick={onClose}>
            <IoClose />
          </button>
        </div>

        {showReportCategories ? (
          <div className="post-menu-options">
            <h4>Why are you reporting this?</h4>
            <button className="post-menu-option" onClick={() => handleReport('spam')}>
              <span>Spam</span>
            </button>
            <button className="post-menu-option" onClick={() => handleReport('harassment')}>
              <span>Harassment</span>
            </button>
            <button className="post-menu-option" onClick={() => handleReport('hate_speech')}>
              <span>Hate Speech</span>
            </button>
            <button className="post-menu-option" onClick={() => handleReport('violence')}>
              <span>Violence</span>
            </button>
            <button className="post-menu-option" onClick={() => handleReport('false_information')}>
              <span>False Information</span>
            </button>
            <button className="post-menu-option" onClick={() => handleReport('other')}>
              <span>Other</span>
            </button>
            <button className="post-menu-option" onClick={() => setShowReportCategories(false)}>
              <span>Back</span>
            </button>
          </div>
        ) : (
          <div className="post-menu-options">
            {ownPost ? <>
                <button
                  className="post-menu-option"
                  onClick={() => {
                    if (onEdit) {
                      onClose();
                      onEdit(post);
                    }
                  }}
                >
                  <IoTrashOutline />
                  <span>Edit Post</span>
                </button>
                <button className="post-menu-option danger" onClick={handleDelete}>
                  <IoTrashOutline />
                  <span>Delete Post</span>
                </button>
              </> : null}

            {!ownPost && (
              <>
                <button className="post-menu-option" onClick={() => setShowReportCategories(true)}>
                  <IoFlagOutline />
                  <span>Report Post</span>
                </button>

                <button className="post-menu-option" onClick={handleBlockAuthor}>
                  <IoBanOutline />
                  <span>
                    {isAuthorBlocked ? 'Unblock ' : 'Block '}
                    {post.author?.name || 'User'}
                  </span>
                </button>
              </>
            )}

            <button className="post-menu-option" onClick={handleCopyLink}>
              <IoLinkOutline />
              <span>Copy Link</span>
            </button>

            <button className="post-menu-option" onClick={onClose}>
              <IoClose />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default PostMenu;





