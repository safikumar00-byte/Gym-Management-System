import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { 
  communityPosts, 
  communityComments, 
  communityReactions, 
  communityReports, 
  members, 
  userProfiles 
} from '../db/schema.ts';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit.ts';

const router = Router();

// GET /api/community/feed - Retrieve tenant-isolated community feed
router.get('/feed', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const userId = req.user!.userId;

    // Fetch active non-deleted posts
    const posts = await db.query.communityPosts.findMany({
      where: and(
        eq(communityPosts.gymId, gymId),
        sql`${communityPosts.deletedAt} IS NULL`
      ),
      orderBy: (p, { desc }) => [desc(p.isPinned), desc(p.createdAt)],
      limit: 50,
      with: {
        comments: {
          where: sql`${communityComments.deletedAt} IS NULL`,
          orderBy: (c, { asc }) => [asc(c.createdAt)],
          limit: 10,
        },
        reactions: true,
      },
    });

    // Augment with current user's reaction status
    const feed = posts.map(post => {
      const userReaction = (post.reactions || []).find(r => r.userId === userId);
      return {
        id: post.id,
        gymId: post.gymId,
        authorUserId: post.authorUserId,
        authorMemberId: post.authorMemberId,
        authorName: post.authorName,
        authorRole: post.authorRole,
        content: post.content,
        mediaUrl: post.mediaUrl,
        postType: post.postType,
        isPinned: post.isPinned,
        likesCount: post.reactions ? post.reactions.length : post.likesCount,
        commentsCount: post.comments ? post.comments.length : post.commentsCount,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        hasLiked: !!userReaction,
        userReaction: userReaction ? userReaction.reactionType : null,
        comments: (post.comments || []).map(c => ({
          id: c.id,
          postId: c.postId,
          authorUserId: c.authorUserId,
          authorName: c.authorName,
          content: c.content,
          createdAt: c.createdAt,
          isSelf: c.authorUserId === userId,
        })),
        isAuthor: post.authorUserId === userId,
      };
    });

    res.json(feed);
  } catch (error: any) {
    console.error('Error fetching community feed:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load community feed' } });
  }
});

// POST /api/community/posts - Create post on community wall
router.post('/posts', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const userId = req.user!.userId;
    const userRole = (req.user!.role || 'MEMBER').toUpperCase();
    const { content, mediaUrl, postType = 'MEMBER_POST', isPinned = false } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Post content cannot be empty' } });
    }

    const isStaff = ['OWNER', 'MANAGER', 'TRAINER'].includes(userRole);

    // Only staff can pin or create GYM_ANNOUNCEMENT
    let finalPinned = false;
    let finalPostType = postType;

    if (isStaff) {
      finalPinned = Boolean(isPinned);
    } else {
      if (postType === 'GYM_ANNOUNCEMENT') {
        finalPostType = 'MEMBER_POST';
      }
    }

    // Resolve author member ID if exists
    const authorMember = await db.query.members.findFirst({
      where: and(eq(members.userId, userId), eq(members.gymId, gymId)),
    });

    const [newPost] = await db.insert(communityPosts).values({
      gymId,
      authorUserId: userId,
      authorMemberId: authorMember ? authorMember.id : null,
      authorName: req.user!.name || 'Gym Member',
      authorRole: userRole,
      content: String(content).trim(),
      mediaUrl: mediaUrl ? String(mediaUrl).trim() : null,
      postType: finalPostType,
      isPinned: finalPinned,
      likesCount: 0,
      commentsCount: 0,
    }).returning();

    await logAuditEvent({
      gymId,
      userId,
      action: 'POST_CREATED',
      entityType: 'COMMUNITY_POST',
      entityId: newPost.id,
      details: `User ${req.user!.name} created community post (${finalPostType}).`,
    });

    res.status(201).json({
      ...newPost,
      hasLiked: false,
      userReaction: null,
      comments: [],
      isAuthor: true,
    });
  } catch (error: any) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to publish post' } });
  }
});

// DELETE /api/community/posts/:id - Author or Staff moderation delete
router.delete('/posts/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const userId = req.user!.userId;
    const userRole = (req.user!.role || 'MEMBER').toUpperCase();
    const postId = req.params.id;

    const post = await db.query.communityPosts.findFirst({
      where: and(eq(communityPosts.id, postId), eq(communityPosts.gymId, gymId)),
    });

    if (!post) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    }

    const isAuthor = post.authorUserId === userId;
    const isStaff = ['OWNER', 'MANAGER'].includes(userRole);

    if (!isAuthor && !isStaff) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this post.' } });
    }

    // Soft delete to maintain auditability
    await db.update(communityPosts)
      .set({ deletedAt: new Date() })
      .where(eq(communityPosts.id, postId));

    await logAuditEvent({
      gymId,
      userId,
      action: 'POST_DELETED',
      entityType: 'COMMUNITY_POST',
      entityId: postId,
      details: `${isStaff && !isAuthor ? 'Staff moderated and deleted' : 'Author deleted'} post ${postId}.`,
    });

    res.json({ success: true, message: 'Post removed' });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete post' } });
  }
});

// POST /api/community/posts/:id/comments - Add comment to post
router.post('/posts/:id/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const userId = req.user!.userId;
    const postId = req.params.id;
    const { content } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Comment cannot be empty' } });
    }

    // Confirm post exists in gym
    const post = await db.query.communityPosts.findFirst({
      where: and(
        eq(communityPosts.id, postId),
        eq(communityPosts.gymId, gymId),
        sql`${communityPosts.deletedAt} IS NULL`
      ),
    });

    if (!post) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    }

    const [comment] = await db.insert(communityComments).values({
      postId,
      gymId,
      authorUserId: userId,
      authorName: req.user!.name || 'Gym Member',
      content: String(content).trim(),
    }).returning();

    // Increment comment count
    await db.update(communityPosts)
      .set({
        commentsCount: sql`${communityPosts.commentsCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(communityPosts.id, postId));

    res.status(201).json({
      ...comment,
      isSelf: true,
    });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add comment' } });
  }
});

// DELETE /api/community/comments/:id - Delete comment
router.delete('/comments/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const userId = req.user!.userId;
    const userRole = (req.user!.role || 'MEMBER').toUpperCase();
    const commentId = req.params.id;

    const comment = await db.query.communityComments.findFirst({
      where: and(eq(communityComments.id, commentId), eq(communityComments.gymId, gymId)),
    });

    if (!comment) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Comment not found' } });
    }

    const isAuthor = comment.authorUserId === userId;
    const isStaff = ['OWNER', 'MANAGER'].includes(userRole);

    if (!isAuthor && !isStaff) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Permission denied.' } });
    }

    await db.update(communityComments)
      .set({ deletedAt: new Date() })
      .where(eq(communityComments.id, commentId));

    // Decrement post comments count
    await db.update(communityPosts)
      .set({
        commentsCount: sql`GREATEST(0, ${communityPosts.commentsCount} - 1)`,
        updatedAt: new Date(),
      })
      .where(eq(communityPosts.id, comment.postId));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete comment' } });
  }
});

// POST /api/community/posts/:id/reactions - Toggle reaction on post
router.post('/posts/:id/reactions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const userId = req.user!.userId;
    const postId = req.params.id;
    const { reactionType = 'LIKE' } = req.body;

    const post = await db.query.communityPosts.findFirst({
      where: and(
        eq(communityPosts.id, postId),
        eq(communityPosts.gymId, gymId),
        sql`${communityPosts.deletedAt} IS NULL`
      ),
    });

    if (!post) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    }

    const existingReaction = await db.query.communityReactions.findFirst({
      where: and(
        eq(communityReactions.postId, postId),
        eq(communityReactions.userId, userId)
      ),
    });

    if (existingReaction) {
      // If same reaction, toggle off (unlike)
      if (existingReaction.reactionType === reactionType) {
        await db.delete(communityReactions)
          .where(eq(communityReactions.id, existingReaction.id));

        await db.update(communityPosts)
          .set({
            likesCount: sql`GREATEST(0, ${communityPosts.likesCount} - 1)`,
            updatedAt: new Date(),
          })
          .where(eq(communityPosts.id, postId));

        return res.json({ hasLiked: false, reactionType: null });
      } else {
        // Change reaction type
        await db.update(communityReactions)
          .set({ reactionType })
          .where(eq(communityReactions.id, existingReaction.id));

        return res.json({ hasLiked: true, reactionType });
      }
    } else {
      // Add reaction
      await db.insert(communityReactions).values({
        postId,
        gymId,
        userId,
        reactionType,
      });

      await db.update(communityPosts)
        .set({
          likesCount: sql`${communityPosts.likesCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(communityPosts.id, postId));

      return res.json({ hasLiked: true, reactionType });
    }
  } catch (error: any) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to process reaction' } });
  }
});

// POST /api/community/posts/:id/report - Report post for inappropriate content
router.post('/posts/:id/report', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const userId = req.user!.userId;
    const postId = req.params.id;
    const { reason } = req.body;

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please provide a reason for reporting' } });
    }

    const [report] = await db.insert(communityReports).values({
      gymId,
      postId,
      reportedByUserId: userId,
      reason: String(reason).trim(),
      status: 'PENDING',
    }).returning();

    res.json({ success: true, message: 'Report submitted for gym moderation review.' });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to submit report' } });
  }
});

export default router;
