import { useEffect, useState, useCallback } from 'react';
import { ESP_LOGIN_IMAGE_URLS } from '../../data/espLoginSlides';

const INTERVAL_MS = 6500;

export default function EspLoginBackdrop() {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % ESP_LOGIN_IMAGE_URLS.length);
  }, []);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + ESP_LOGIN_IMAGE_URLS.length) % ESP_LOGIN_IMAGE_URLS.length);
  }, []);

  useEffect(() => {
    ESP_LOGIN_IMAGE_URLS.forEach((src) => {
      const im = new Image();
      im.src = src;
    });
  }, []);

  useEffect(() => {
    const id = window.setInterval(next, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [next]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a1628]" aria-hidden>
      {ESP_LOGIN_IMAGE_URLS.map((src, i) => {
        const active = i === index;
        return (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-[1100ms] ease-in-out ${
              active ? 'opacity-100 z-[1]' : 'opacity-0 z-0'
            }`}
          >
            <img
              src={src}
              alt=""
              className={`h-full w-full object-cover object-center min-h-full scale-[1.02] ${
                active ? 'animate-login-kenburns' : ''
              }`}
              loading="eager"
              decoding="async"
            />
          </div>
        );
      })}

      {/* Reflets ESP — légers pour laisser voir les photos */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none login-hero-mesh mix-blend-overlay opacity-55"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 25%, rgba(253,185,19,0.28), transparent 50%), radial-gradient(ellipse 55% 45% at 82% 75%, rgba(0,150,57,0.18), transparent 48%)',
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 z-[2] bg-gradient-to-br from-[#0a1628]/55 via-[#0f1b33]/35 to-transparent"
        aria-hidden
      />
      <div
        className="absolute inset-0 z-[2] bg-gradient-to-t from-[#050a12]/90 via-[#050a12]/25 to-[#0a1628]/40"
        aria-hidden
      />
      <div
        className="absolute inset-0 z-[2] opacity-[0.12] mix-blend-soft-light sidebar-pattern pointer-events-none"
        aria-hidden
      />

      <div
        className="absolute bottom-7 sm:bottom-10 left-0 right-0 z-[25] flex justify-center px-4"
        role="tablist"
        aria-label="Diaporama"
      >
        <div className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-xl px-3.5 py-2.5 border border-white/15 shadow-lg">
          {ESP_LOGIN_IMAGE_URLS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Photo ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                i === index ? 'w-9 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]' : 'w-2 bg-white/35 hover:bg-white/55'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
