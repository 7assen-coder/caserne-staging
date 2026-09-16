import { useEffect, useState, useCallback } from 'react';
import { ESP_LOGIN_IMAGE_URLS } from '../../data/espLoginSlides';

const INTERVAL_MS = 6500;

export default function EspLoginBackdrop({ className = '', showDots = true }) {
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
    <div className={`absolute inset-0 overflow-hidden bg-[#0a1628] ${className}`.trim()}>
      <div className="absolute inset-0" aria-hidden>
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
                className={`h-full w-full min-h-full scale-[1.02] object-cover object-center ${
                  active ? 'animate-login-kenburns' : ''
                }`}
                loading="eager"
                decoding="async"
              />
            </div>
          );
        })}

        <div
          className="login-hero-mesh pointer-events-none absolute inset-0 z-[2] opacity-55 mix-blend-overlay"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 20% 25%, rgba(253,185,19,0.28), transparent 50%), radial-gradient(ellipse 55% 45% at 82% 75%, rgba(0,150,57,0.18), transparent 48%)',
          }}
        />
        <div className="absolute inset-0 z-[2] bg-gradient-to-br from-[#0a1628]/55 via-[#0f1b33]/35 to-transparent" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-t from-[#050a12]/90 via-[#050a12]/25 to-[#0a1628]/40" />
        <div className="sidebar-pattern pointer-events-none absolute inset-0 z-[2] opacity-[0.12] mix-blend-soft-light" />
      </div>

      {showDots ? (
        <div
          className="absolute inset-x-0 bottom-3 z-[25] hidden justify-center px-4 sm:bottom-5 lg:bottom-8 lg:flex"
          role="group"
          aria-label="Diaporama"
        >
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-2 shadow-lg backdrop-blur-xl">
            {ESP_LOGIN_IMAGE_URLS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1}`}
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                  i === index
                    ? 'w-8 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'w-2 bg-white/35 hover:bg-white/55'
                }`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
