import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { 
  Heart, 
  Flame, 
  MessageSquare, 
  Share2, 
  Send, 
  Trash2, 
  Flag, 
  Pin, 
  Trophy, 
  Sparkles, 
  MoreHorizontal,
  User,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const MemberCommunityView: React.FC = () => {
  const { userProfile, role, isOwner, isManager } = useAuth();
  const { showToast } = useToast();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'announcements' | 'my-posts'>('all');

  // New post state
  const [newPostContent, setNewPostContent] = useState('');
  const [postType, setPostType] = useState('MEMBER_POST');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog & Modal states
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [postToReport, setPostToReport] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // Comment input per post
  const [expandedPostComments, setExpandedPostComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isCommenting, setIsCommenting] = useState<Record<string, boolean>>({});

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const res = await api.getCommunityFeed();
      setPosts(res);
    } catch (err: any) {
      console.error('Failed to load feed', err);
      showToast(err.message || 'Failed to load community feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    try {
      setIsSubmitting(true);
      const created = await api.createCommunityPost({
        content: newPostContent.trim(),
        postType,
        isPinned: false,
      });
      setPosts([created, ...posts]);
      setNewPostContent('');
      showToast('Post published to gym wall!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to publish post', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleReaction = async (postId: string, reactionType: string = 'LIKE') => {
    try {
      // Optimistic update
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const wasLiked = p.hasLiked;
          return {
            ...p,
            hasLiked: !wasLiked,
            likesCount: wasLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1,
            userReaction: wasLiked ? null : reactionType,
          };
        }
        return p;
      }));

      await api.toggleCommunityReaction(postId, reactionType);
    } catch (err: any) {
      showToast('Failed to update reaction', 'error');
      fetchFeed(); // Revert on failure
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = (commentInputs[postId] || '').trim();
    if (!content) return;

    try {
      setIsCommenting(prev => ({ ...prev, [postId]: true }));
      const newComment = await api.addCommunityComment(postId, content);

      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: [...(p.comments || []), newComment],
          };
        }
        return p;
      }));

      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment', 'error');
    } finally {
      setIsCommenting(prev => ({ ...prev, [postId]: false }));
    }
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteCommunityPost(postToDelete);
      setPosts(prev => prev.filter(p => p.id !== postToDelete));
      showToast('Post removed successfully');
      setPostToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete post', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmReportPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postToReport || !reportReason.trim()) return;

    try {
      setIsReporting(true);
      await api.reportCommunityPost(postToReport, reportReason.trim());
      showToast('Report submitted for gym staff moderation review.');
      setPostToReport(null);
      setReportReason('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit report', 'error');
    } finally {
      setIsReporting(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'announcements') {
      return post.isPinned || post.postType === 'GYM_ANNOUNCEMENT';
    }
    if (filter === 'my-posts') {
      return post.isAuthor;
    }
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header & Filter Tabs */}
      <div className="bg-white p-5 rounded-[24px] border border-[#e5e5ea] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1d1d1f] tracking-tight">
            Gym Community Wall
          </h1>
          <p className="text-[13px] text-[#6e6e73]">
            Celebrate PRs, share routines, ask trainers questions, and stay inspired.
          </p>
        </div>

        <div className="flex p-1 bg-[#f5f5f7] rounded-full border border-[#e5e5ea] text-[12px] font-medium self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              filter === 'all' ? 'bg-white text-[#1d1d1f] shadow-xs' : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            All Posts
          </button>
          <button
            onClick={() => setFilter('announcements')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              filter === 'announcements' ? 'bg-white text-[#1d1d1f] shadow-xs' : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Announcements
          </button>
          <button
            onClick={() => setFilter('my-posts')}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              filter === 'my-posts' ? 'bg-white text-[#1d1d1f] shadow-xs' : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            My Posts
          </button>
        </div>
      </div>

      {/* Share / Create Post Box */}
      <div className="bg-white p-5 rounded-[24px] border border-[#e5e5ea] shadow-xs">
        <form onSubmit={handleCreatePost} className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f0f4ff] border border-[#0071e3]/20 flex items-center justify-center font-bold text-[#0071e3] shrink-0">
              {(userProfile?.name || 'M').charAt(0)}
            </div>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Hit a new PR? Got a workout question or shoutout for your training crew?"
              rows={3}
              className="w-full p-3 bg-[#f5f5f7] border border-[#e5e5ea] rounded-[16px] text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] transition-all resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mr-1">
                Post Type:
              </span>
              <button
                type="button"
                onClick={() => setPostType('MEMBER_POST')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
                  postType === 'MEMBER_POST'
                    ? 'bg-[#1d1d1f] text-white border-[#1d1d1f]'
                    : 'bg-[#fafafc] text-[#6e6e73] border-[#e5e5ea] hover:border-[#b0b0b5]'
                }`}
              >
                General Update
              </button>
              <button
                type="button"
                onClick={() => setPostType('ACHIEVEMENT')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border flex items-center gap-1 ${
                  postType === 'ACHIEVEMENT'
                    ? 'bg-[#ff9500] text-white border-[#ff9500]'
                    : 'bg-[#fafafc] text-[#6e6e73] border-[#e5e5ea] hover:border-[#b0b0b5]'
                }`}
              >
                <Trophy size={12} />
                <span>PR / Achievement</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !newPostContent.trim()}
              className="px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-[13px] font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer self-end sm:self-auto"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={14} />
              )}
              <span>Publish</span>
            </button>
          </div>
        </form>
      </div>

      {/* Feed List */}
      {loading ? (
        <div className="py-12 text-center text-[#86868b] text-[13px]">
          Loading community wall...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white p-8 rounded-[24px] border border-[#e5e5ea] text-center space-y-2">
          <p className="text-[15px] font-semibold text-[#1d1d1f]">No posts found</p>
          <p className="text-[13px] text-[#86868b]">
            Be the first to share an update on your gym wall!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map(post => {
            const isCommentsOpen = expandedPostComments[post.id] || false;
            const commentsList = post.comments || [];

            return (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-[24px] border transition-all ${
                  post.isPinned ? 'border-[#0071e3]/40 shadow-xs' : 'border-[#e5e5ea] shadow-xs'
                }`}
              >
                <div className="p-5">
                  {/* Pinned pill if pinned */}
                  {post.isPinned && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0071e3] mb-3 bg-[#f0f4ff] px-3 py-1 rounded-full w-fit">
                      <Pin size={12} className="fill-[#0071e3]" />
                      <span>PINNED ANNOUNCEMENT</span>
                    </div>
                  )}

                  {/* Header: Author info + Date + Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#e5e5ea] flex items-center justify-center font-bold text-[#1d1d1f] text-[14px]">
                        {post.authorName ? post.authorName.charAt(0) : 'M'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[14px] text-[#1d1d1f]">
                            {post.authorName}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            post.authorRole === 'OWNER'
                              ? 'bg-[#f0f4ff] text-[#0071e3] border-[#0071e3]/30'
                              : post.authorRole === 'MANAGER'
                              ? 'bg-[#fffaf0] text-[#ff9500] border-[#ff9500]/30'
                              : post.authorRole === 'TRAINER'
                              ? 'bg-[#f4fcf6] text-[#34c759] border-[#34c759]/30'
                              : 'bg-[#fafafc] text-[#6e6e73] border-[#e5e5ea]'
                          }`}>
                            {post.authorRole}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#86868b]">
                          {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {post.postType === 'ACHIEVEMENT' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ff9500] bg-[#fff8eb] px-2.5 py-1 rounded-full border border-[#ff9500]/20">
                          <Trophy size={12} /> PR
                        </span>
                      )}

                      {(post.isAuthor || isOwner || isManager) && (
                        <button
                          onClick={() => setPostToDelete(post.id)}
                          className="p-1.5 text-[#86868b] hover:text-[#ff3b30] hover:bg-[#fff2f2] rounded-full transition-all cursor-pointer"
                          title="Delete post"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}

                      {!post.isAuthor && (
                        <button
                          onClick={() => {
                            setPostToReport(post.id);
                            setReportReason('');
                          }}
                          className="p-1.5 text-[#86868b] hover:text-[#ff9500] hover:bg-[#fffaf0] rounded-full transition-all cursor-pointer"
                          title="Report post"
                        >
                          <Flag size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <p className="text-[14px] text-[#1d1d1f] leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Reaction and Comment Counter Bar */}
                  <div className="mt-4 pt-3 border-t border-[#f0f0f2] flex items-center justify-between text-[12px] text-[#6e6e73]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleReaction(post.id, 'LIKE')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer border ${
                          post.hasLiked 
                            ? 'bg-[#fff0f2] text-[#ff2d55] border-[#ff2d55]/30 font-semibold' 
                            : 'bg-[#fafafc] text-[#6e6e73] border-[#e5e5ea] hover:border-[#b0b0b5]'
                        }`}
                      >
                        <Heart size={14} className={post.hasLiked ? 'fill-[#ff2d55]' : ''} />
                        <span>{post.likesCount}</span>
                      </button>

                      <button
                        onClick={() => handleToggleReaction(post.id, 'FIRE')}
                        className="px-2.5 py-1.5 rounded-full text-[12px] bg-[#fafafc] hover:bg-[#f5f5f7] border border-[#e5e5ea] transition-all cursor-pointer flex items-center gap-1"
                        title="Cheer with Fire"
                      >
                        <Flame size={14} className="text-[#ff9500]" />
                      </button>
                    </div>

                    <button
                      onClick={() => setExpandedPostComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-[#f5f5f7] text-[#1d1d1f] font-medium transition-all cursor-pointer"
                    >
                      <MessageSquare size={14} className="text-[#86868b]" />
                      <span>{post.commentsCount} comments</span>
                    </button>
                  </div>
                </div>

                {/* Expandable Comments Drawer */}
                <AnimatePresence>
                  {isCommentsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-[#fafafc] px-5 py-4 border-t border-[#f0f0f2] rounded-b-[24px] space-y-3"
                    >
                      {/* Comments list */}
                      {commentsList.length > 0 ? (
                        <div className="space-y-2.5">
                          {commentsList.map((c: any) => (
                            <div key={c.id} className="p-3 bg-white border border-[#e5e5ea] rounded-[16px] text-[13px]">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-[#1d1d1f] text-[12px]">
                                  {c.authorName}
                                </span>
                                <span className="text-[11px] text-[#86868b]">
                                  {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[#1d1d1f]">{c.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[12px] text-[#86868b] py-2 text-center">
                          No comments yet. Write the first response!
                        </div>
                      )}

                      {/* Add comment input */}
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                          placeholder="Write a comment..."
                          className="flex-1 px-3.5 py-2 bg-white border border-[#e5e5ea] rounded-full text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={isCommenting[post.id] || !(commentInputs[post.id] || '').trim()}
                          className="p-2 bg-[#0071e3] text-white rounded-full hover:bg-[#0077ed] disabled:opacity-50 transition-all cursor-pointer"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete Post Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(postToDelete)}
        onClose={() => setPostToDelete(null)}
        onCancel={() => setPostToDelete(null)}
        onConfirm={confirmDeletePost}
        title="Delete Community Post"
        message="Are you sure you want to delete this post from the gym wall? This cannot be undone."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Post'}
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Report Post Modal */}
      <Modal
        isOpen={Boolean(postToReport)}
        onClose={() => {
          setPostToReport(null);
          setReportReason('');
        }}
        title="Report Post to Staff"
        maxWidth="md"
      >
        <form onSubmit={confirmReportPost} className="space-y-4">
          <p className="text-[13px] text-[#6e6e73]">
            Please tell us why you are reporting this post. Gym administrators and moderators will inspect it promptly.
          </p>

          <div>
            <label className="text-[12px] font-semibold text-[#1d1d1f] mb-1.5 block">
              Reason for Report
            </label>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="e.g. Inappropriate language, spam, unsolicited promotional link..."
              rows={3}
              required
              className="w-full px-3.5 py-2.5 bg-[#f5f5f7] border border-[#e5e5ea] rounded-[12px] text-[13px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f0f2]">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setPostToReport(null);
                setReportReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="md"
              disabled={isReporting || !reportReason.trim()}
              isLoading={isReporting}
            >
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
