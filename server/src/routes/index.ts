import express, { RequestHandler } from 'express';
import auth, { optionalAuth } from '../middlewares/auth';
import catchAsync from '../utils/catchAsync';
import * as admin from '../modules/admin/admin.controller';
import * as course from '../modules/course/course.controller';
import * as forum from '../modules/forum/forum.controller';
import * as notification from '../modules/notification/notification.controller';
import * as planner from '../modules/planner/planner.controller';
import * as review from '../modules/review/review.controller';
import { events, notes, todos } from '../modules/study/study.controller';
import * as authc from '../modules/user/auth.controller';
import * as profile from '../modules/user/profile.controller';

const router = express.Router();

const h = (fn: RequestHandler) => catchAsync(fn);
const signedIn = auth();
const adminOnly = auth('admin');

router.post('/auth/register', h(authc.register));
router.post('/auth/login', h(authc.login));
router.post('/auth/logout', h(authc.logout));
router.get('/auth/me', signedIn, h(authc.me));

router.patch('/me', signedIn, h(profile.updateProfile));
router.post('/me/email', signedIn, h(profile.changeEmail));
router.post('/me/password', signedIn, h(profile.changePassword));
router.get('/me/saved', signedIn, h(profile.savedCourses));
router.get('/me/activity', signedIn, h(profile.myActivity));
router.get('/me/dashboard', signedIn, h(profile.dashboard));

router.get('/notifications', signedIn, h(notification.listNotifications));
router.post('/notifications/read', signedIn, h(notification.readAll));

router.get('/stats', h(admin.publicStats));
router.get('/departments', h(course.departments));
router.get('/courses', optionalAuth, h(course.listCourses));
router.get('/courses/:key', optionalAuth, h(course.getCourse));
router.post('/courses', adminOnly, h(course.createCourse));
router.put('/courses/:key', adminOnly, h(course.updateCourse));
router.delete('/courses/:key', adminOnly, h(course.deleteCourse));
router.post('/courses/:key/save', signedIn, h(profile.toggleSaved));

router.get('/reviews/recent', optionalAuth, h(review.recentReviews));
router.get('/courses/:key/reviews', optionalAuth, h(review.listReviews));
router.post('/courses/:key/reviews', signedIn, h(review.createReview));
router.put('/reviews/:id', signedIn, h(review.updateReview));
router.delete('/reviews/:id', signedIn, h(review.deleteReview));
router.post('/reviews/:id/helpful', signedIn, h(review.toggleHelpful));
router.get('/reviews/:id/comments', optionalAuth, h(review.listReviewComments));
router.post('/reviews/:id/comments', signedIn, h(review.addReviewComment));
router.put('/review-comments/:id', signedIn, h(review.updateReviewComment));
router.delete('/review-comments/:id', signedIn, h(review.deleteReviewComment));

router.get('/threads', optionalAuth, h(forum.listThreads));
router.get('/threads/courses', h(forum.forumCourses));
router.post('/threads', signedIn, h(forum.createThread));
router.get('/threads/:id', optionalAuth, h(forum.getThread));
router.put('/threads/:id', signedIn, h(forum.updateThread));
router.delete('/threads/:id', signedIn, h(forum.deleteThread));
router.post('/threads/:id/vote', signedIn, h(forum.voteThread));
router.post('/threads/:id/answers', signedIn, h(forum.addAnswer));
router.put('/answers/:id', signedIn, h(forum.updateAnswer));
router.delete('/answers/:id', signedIn, h(forum.deleteAnswer));
router.post('/answers/:id/vote', signedIn, h(forum.voteAnswer));
router.post('/answers/:id/accept', signedIn, h(forum.acceptAnswer));

for (const [path, handlers] of [['todos', todos], ['events', events], ['notes', notes]] as const) {
  router.get(`/${path}`, signedIn, h(handlers.list));
  router.post(`/${path}`, signedIn, h(handlers.create));
  router.get(`/${path}/:id`, signedIn, h(handlers.get));
  router.put(`/${path}/:id`, signedIn, h(handlers.update));
  router.delete(`/${path}/:id`, signedIn, h(handlers.remove));
}

router.get('/planner', signedIn, h(planner.getPlan));
router.post('/planner/semesters', signedIn, h(planner.addSemester));
router.delete('/planner/semesters/:id', signedIn, h(planner.removeSemester));
router.post('/planner/semesters/:id/courses', signedIn, h(planner.planCourse));
router.delete('/planner/semesters/:id/courses/:courseId', signedIn, h(planner.unplanCourse));
router.post('/planner/records', signedIn, h(planner.saveRecord));
router.put('/planner/records', signedIn, h(planner.importRecords));
router.delete('/planner/records', signedIn, h(planner.clearRecords));
router.delete('/planner/records/:id', signedIn, h(planner.removeRecord));

router.get('/admin/overview', adminOnly, h(admin.overview));
router.get('/admin/users', adminOnly, h(admin.listUsers));
router.patch('/admin/users/:id/role', adminOnly, h(admin.setRole));

export default router;
