import { useEffect, useRef, useState } from 'react';

/**
 * Fade-and-rise on scroll into view (React Bits "AnimatedContent", adapted:
 * one subtle transition, honors prefers-reduced-motion, no dependencies).
 */
export function Reveal({ children, delay = 0, as: Tag = 'div', className = '', ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('in');
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * Animated number (React Bits "CountUp", adapted). Animates to the value
 * whenever `to` changes — works when the number arrives asynchronously
 * (fetched stats). Decimals preserved; suffix/prefix for %, +, etc.
 */
export function CountUp({ to, duration = 1200, prefix = '', suffix = '', decimals = 0, className = '' }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(to);
      return undefined;
    }
    // `to` can arrive asynchronously (e.g. stats fetched after mount), so the
    // effect re-runs on every change — always animate to the latest value.
    const t0 = performance.now();
    const from = 0;
    let raf = 0;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return (
    <span className={`countup ${className}`}>
      {prefix}{val.toFixed(decimals)}{suffix}
    </span>
  );
}

/**
 * Word-by-word heading reveal (React Bits "SplitText", adapted, CSS-driven).
 */
export function SplitText({ text, className = '', stagger = 55, startDelay = 80 }) {
  return (
    <span className={`split-reveal ${className}`} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} aria-hidden="true">
          <span className="w" style={{ animationDelay: `${startDelay + i * stagger}ms` }}>{w}</span>
          {i < text.split(' ').length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}
