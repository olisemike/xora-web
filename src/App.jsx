import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Trending from './pages/Trending';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import PostDetail from './pages/PostDetail';
import HashtagPage from './pages/HashtagPage';
import SearchPage from './pages/SearchPage';
import ReelsPage from './pages/ReelsPage';
import BlockedUsersPage from './pages/BlockedUsersPage';
import StoryViewPage from './pages/StoryViewPage';
import Bookmarks from './pages/Bookmarks';
import Pages from './pages/Pages';
import PageProfile from './pages/PageProfile';
import EditPage from './pages/EditPage';
import Followers from './pages/Followers';
import Following from './pages/Following';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import CreatePost from './pages/CreatePost';
import EditProfile from './pages/EditProfile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerificationSent from './pages/VerificationSent';
import VerificationCode from './pages/VerificationCode';
import VerificationSuccess from './pages/VerificationSuccess';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Enable2FA from './pages/Enable2FA';
import SubmitReport from './pages/SubmitReport';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './hooks/useNotifications';
import { useToast } from './components/Toast';
import NotificationToast from './components/NotificationToast';

function AppRoutes({ isAuthenticated }) {
  const publicOnlyRoute = (Component) => (isAuthenticated ? <Navigate to="/" /> : <Component />);
  const protectedRoute = (Component) => (isAuthenticated ? <Layout><Component /></Layout> : <Navigate to="/login" />);

  return (
    <Routes>
      <Route path="/login" element={publicOnlyRoute(Login)} />
      <Route path="/signup" element={publicOnlyRoute(SignUp)} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verification-sent" element={<VerificationSent />} />
      <Route path="/verify-email" element={<VerificationCode />} />
      <Route path="/verification-success" element={<VerificationSuccess />} />
      <Route path="/" element={protectedRoute(Home)} />
      <Route path="/explore" element={protectedRoute(Explore)} />
      <Route path="/trending" element={protectedRoute(Trending)} />
      <Route path="/messages" element={protectedRoute(Messages)} />
      <Route path="/notifications" element={protectedRoute(Notifications)} />
      <Route path="/profile/:username" element={protectedRoute(Profile)} />
      <Route path="/edit-profile" element={protectedRoute(EditProfile)} />
      <Route path="/settings" element={protectedRoute(Settings)} />
      <Route path="/post/:id" element={protectedRoute(PostDetail)} />
      <Route path="/hashtag/:tag" element={protectedRoute(HashtagPage)} />
      <Route path="/search" element={protectedRoute(SearchPage)} />
      <Route path="/bookmarks" element={protectedRoute(Bookmarks)} />
      <Route path="/pages" element={protectedRoute(Pages)} />
      <Route path="/page/:username" element={protectedRoute(PageProfile)} />
      <Route path="/page/:username/edit" element={protectedRoute(EditPage)} />
      <Route path="/followers/:username" element={protectedRoute(Followers)} />
      <Route path="/following/:username" element={protectedRoute(Following)} />
      <Route path="/blocked-users" element={protectedRoute(BlockedUsersPage)} />
      <Route path="/about" element={protectedRoute(AboutUs)} />
      <Route path="/contact" element={protectedRoute(ContactUs)} />
      <Route path="/enable-2fa" element={protectedRoute(Enable2FA)} />
      <Route path="/submit-report" element={protectedRoute(SubmitReport)} />
      <Route path="/reels" element={protectedRoute(ReelsPage)} />
      <Route path="/story/:username" element={protectedRoute(StoryViewPage)} />
      <Route path="/create" element={protectedRoute(CreatePost)} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function AppLoadingShell() {
  return (
    <div className="app-shell-loading">
      <div className="app-shell-loading__mark">
        <span className="app-shell-loading__xora">XoRa</span>
        <span className="app-shell-loading__social">SociAl</span>
      </div>
      <div className="spinner" />
      <p className="app-shell-loading__copy">Loading your feed, messages, and live activity…</p>
    </div>
  );
}

function App() {
  const { loading, isAuthenticated, getCurrentUserId } = useAuth();
  const toast = useToast();

  useEffect(() => {
    const handlePWAUpdate = (event) => {
      const { newWorker } = event.detail;
      toast.info('New version available! Updating in 3 seconds...');

      setTimeout(() => {
        newWorker.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }, 3000);
    };

    window.addEventListener('pwa-update-available', handlePWAUpdate);
    return () => window.removeEventListener('pwa-update-available', handlePWAUpdate);
  }, [toast]);

  if (loading) {
    return <AppLoadingShell />;
  }

  return (
    <ErrorBoundary>
      <NotificationProvider userId={getCurrentUserId()}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <NotificationToast />
          <AppRoutes isAuthenticated={isAuthenticated} />
        </Router>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
