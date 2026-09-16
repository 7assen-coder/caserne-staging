import { useLocale } from '../../context/LocaleContext';

/** Flips horizontal directional icons in RTL layouts. */
export default function RtlIcon({ icon: Icon, className = '', size, ...props }) {
  const { isRtl } = useLocale();
  return (
    <Icon
      size={size}
      className={`${className} ${isRtl ? 'rotate-180' : ''}`.trim()}
      aria-hidden
      {...props}
    />
  );
}
