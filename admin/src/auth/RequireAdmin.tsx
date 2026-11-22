import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAdmin() {
  const { session, signOut } = useAuth();

  if (!session) return <Navigate to="/sign-in" replace />;

  if (session.user.role !== 'admin') {
    return (
      <main className="centered-state">
        <div className="panel narrow">
          <p className="eyebrow">Access denied</p>
          <h1>This console is for admins</h1>
          <p className="muted">
            Signed in as {session.user.email}. The API will reject non-admin
            tokens on every <code>/admin</code> route, so this tab stops here.
          </p>
          <div className="row gap">
            <button className="button" type="button" onClick={() => void signOut()}>
              Sign out
            </button>
            <Link className="button ghost" to="/sign-in">
              Use another account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <Outlet />;
}
