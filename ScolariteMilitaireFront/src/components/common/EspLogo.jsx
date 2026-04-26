/**
 * Logo ESP (PNG transparent) — /public/esp-logo.png
 */
export default function EspLogo({ className = 'w-11 h-11', alt = 'ESP' }) {
  return (
    <img
      src="/esp-logo.png"
      alt={alt}
      className={`object-contain shrink-0 ${className}`}
      loading="eager"
      decoding="async"
    />
  );
}
