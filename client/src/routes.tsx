import { lazy, ReactNode, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Loading, RequireAuth } from './components/bits';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import CourseDetail from './pages/CourseDetail';
import Courses from './pages/Courses';
import Forum from './pages/Forum';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Planner from './pages/Planner';
import Profile from './pages/Profile';
import Thread from './pages/Thread';

// the note editor (Quill) and pdf.js are the heaviest things in the app, so
// the pages that use them and the admin screens only load when opened
const Study = lazy(() => import('./pages/Study'));
const Watch = lazy(() => import('./pages/Watch'));
const Admin = lazy(() => import('./pages/Admin'));
const Cgpa = lazy(() => import('./pages/Cgpa'));

const later = (page: ReactNode) => (
  <Suspense fallback={<div className="page"><Loading /></div>}>{page}</Suspense>
);

const router = createBrowserRouter([
  { path: '/login', element: <Auth /> },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/courses', element: <Courses /> },
      { path: '/courses/:code', element: <CourseDetail /> },
      { path: '/watch', element: later(<Watch />) },
      { path: '/forum', element: <Forum /> },
      { path: '/forum/:id', element: <Thread /> },
      { path: '/study', element: <RequireAuth>{later(<Study />)}</RequireAuth> },
      { path: '/cgpa', element: later(<Cgpa />) },
      { path: '/planner', element: <RequireAuth><Planner /></RequireAuth> },
      { path: '/profile', element: <RequireAuth><Profile /></RequireAuth> },
      { path: '/admin', element: <RequireAuth admin>{later(<Admin />)}</RequireAuth> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default router;
