import { consultationTypeLabel } from '../../data/medicalCatalog';

export default function MedicalTypeBadge({ type }) {
  const styles = {
    consultation: 'bg-sky-50 text-sky-900 ring-sky-200',
    incident: 'bg-rose-50 text-rose-800 ring-rose-200',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
        styles[type] ?? styles.consultation
      }`}
    >
      {consultationTypeLabel(type)}
    </span>
  );
}
