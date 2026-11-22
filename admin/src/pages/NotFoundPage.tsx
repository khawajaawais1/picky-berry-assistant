import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export function NotFoundPage() {
  return (
    <EmptyState title="This route does not exist">
      <Link className="text-link" to="/">
        Back to the overview
      </Link>
    </EmptyState>
  );
}
