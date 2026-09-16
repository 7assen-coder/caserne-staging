import { Component } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import Button from './Button';

/**
 * Catches render errors so officers see a recovery UI instead of a blank screen.
 * Pass resetKeys (e.g. [pathname]) to clear the error when navigating away.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    const { resetKeys } = this.props;
    if (!this.state.error || !resetKeys) return;
    const prev = prevProps.resetKeys ?? [];
    const next = resetKeys ?? [];
    if (prev.length !== next.length || prev.some((k, i) => k !== next[i])) {
      this.setState({ error: null });
    }
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    const {
      children,
      title = 'Une erreur d’affichage est survenue',
      homeTo = '/dashboard',
      fallback,
    } = this.props;

    if (!error) return children;

    if (typeof fallback === 'function') {
      return fallback({ error, reset: this.handleReset });
    }

    return (
      <div
        role="alert"
        className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center"
      >
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-200">
          <AlertTriangle size={28} aria-hidden />
        </span>
        <h1 className="font-serif text-xl font-semibold text-navy">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          La page n’a pas pu s’afficher correctement. Vous pouvez réessayer ou revenir à l’accueil.
        </p>
        {import.meta.env.DEV && error?.message ? (
          <details className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700">
            <summary className="cursor-pointer font-semibold">Détail (dev)</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{error.message}</pre>
          </details>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="primary" size="sm" icon={RefreshCw} onClick={this.handleReset}>
            Réessayer
          </Button>
          <Link
            to={homeTo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-light-gray bg-white px-3 py-2 text-sm font-semibold text-navy shadow-sm hover:bg-slate-50"
          >
            <Home size={16} aria-hidden />
            Retour à l’accueil
          </Link>
        </div>
      </div>
    );
  }
}
