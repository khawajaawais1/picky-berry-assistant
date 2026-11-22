import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { API_BASE } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, Field } from '../components/ui';

export function SignInPage() {
  const { session, signIn, signingIn, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (session) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch {
      // The context renders the API's message beside the form.
    }
  };

  return (
    <div className="signin">
      <section className="signin-brand">
        <div className="brand brand-large">
          <img src="/berry.svg" alt="" width={44} height={44} />
          <span>
            <strong>Picky</strong>
            <small>Operator console</small>
          </span>
        </div>
        <p className="eyebrow">Team Picky · feature E5</p>
        <h1>The operator side of the berry map.</h1>
        <p className="signin-lede">
          Watch coverage and freshness, inspect a zone, retry a stuck job and
          exercise the API — away from the field app.
        </p>
        <ul className="signin-points">
          <li>Every route is admin-only and audited.</li>
          <li>Reads the live database through picky-server.</li>
          <li>No privileged capability ships to phones (ADR-012).</li>
        </ul>
        <p className="mono small muted api-line" title={API_BASE}>
          API · {API_BASE}
        </p>
      </section>

      <section className="signin-form-wrap" aria-labelledby="signin-title">
        <form className="panel signin-form" onSubmit={(event) => void submit(event)}>
          <div>
            <p className="eyebrow">Admin access</p>
            <h2 id="signin-title">Sign in</h2>
            <p className="muted small">
              Use the same account as the API. Only the admin role can enter.
            </p>
          </div>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <Field label="Email" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) clearError();
              }}
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={10}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) clearError();
              }}
            />
          </Field>

          <Button variant="primary" type="submit" loading={signingIn}>
            Sign in
          </Button>

          <p className="hint">
            First admin? Run{' '}
            <code>npm run make-admin -- you@example.com</code> in{' '}
            <code>picky-server</code>.
          </p>
        </form>
        <p className="muted small signin-foot">
          The field app never carries this token. Sign-in here is the operator
          surface's own session.
        </p>
      </section>
    </div>
  );
}
