import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <p className="text-sm uppercase tracking-widest text-gold">Erreur 404</p>
      <h1 className="text-4xl font-serif text-navy mt-2">Page introuvable</h1>
      <p className="text-sm text-text-light mt-2 max-w-md">
        La page demandée n'existe pas ou a été déplacée. Vérifiez l'adresse ou
        revenez au tableau de bord.
      </p>
      <Link to="/dashboard" className="mt-6 inline-block">
        <Button variant="primary">Retour au tableau de bord</Button>
      </Link>
    </div>
  );
}
