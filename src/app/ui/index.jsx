import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// ───────── Data async ─────────
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const seq = useRef(0);
  const run = useCallback(() => {
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(fn)
      .then((data) => n === seq.current && setState({ data, error: null, loading: false }))
      .catch((error) => n === seq.current && setState({ data: null, error, loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { ...state, reload: run };
}

// ───────── Layout halaman ─────────
export function PageHead({ eyebrow, title, desc, actions }) {
  return (
    <header className="d-head">
      <div className="d-head__copy">
        {eyebrow && <p className="d-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {desc && <p className="d-head__desc">{desc}</p>}
      </div>
      {actions && <div className="d-head__actions">{actions}</div>}
    </header>
  );
}

export function Panel({ title, meta, actions, children, className = "" }) {
  return (
    <section className={`d-panel ${className}`}>
      {(title || actions) && (
        <header className="d-panel__head">
          <div>
            {title && <h2>{title}</h2>}
            {meta && <p className="d-panel__meta">{meta}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, hidden }) {
  return (
    <div className="d-stat">
      <p className="d-stat__label">{label}</p>
      <p className="d-stat__value">{hidden ? <span className="d-muted">Tidak termasuk hak akses</span> : value}</p>
      {sub && !hidden && <p className="d-stat__sub">{sub}</p>}
    </div>
  );
}

export function Loading({ label = "Memuat data…" }) {
  return (
    <div className="d-loading" role="status">
      <span className="d-loading__bar" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  return (
    <div className="d-error" role="alert">
      <p><strong>Gagal memuat.</strong> {String(error?.message ?? error)}</p>
      {onRetry && <button type="button" className="d-btn d-btn--ghost" onClick={onRetry}>Coba lagi</button>}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="d-empty">
      <p className="d-empty__title">{title}</p>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Badge({ tone = "neutral", children }) {
  return <span className={`d-badge d-badge--${tone}`}>{children}</span>;
}

// ───────── Form ─────────
export function Field({ label, hint, error, children, id }) {
  return (
    <div className={`d-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <p className="d-field__hint">{hint}</p>}
      {error && <p className="d-field__error" role="alert">{error}</p>}
    </div>
  );
}

// Dialog native: fokus terkunci & Esc ditangani browser.
export function Modal({ open, title, onClose, children, footer }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="d-modal"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="d-modal-title"
    >
      {open && (
        <form
          method="dialog"
          className="d-modal__inner"
          onSubmit={(e) => e.preventDefault()}
        >
          <header className="d-modal__head">
            <h2 id="d-modal-title">{title}</h2>
            <button type="button" className="d-icon-btn" onClick={onClose} aria-label="Tutup">×</button>
          </header>
          <div className="d-modal__body">{children}</div>
          {footer && <footer className="d-modal__foot">{footer}</footer>}
        </form>
      )}
    </dialog>
  );
}

// ───────── Grafik ─────────
function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Satu seri garis + crosshair/tooltip. points: [{ x: label, y: number }] */
export function LineChart({ points, format, label, height = 220 }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { l: 68, r: 12, t: 12, b: 26 };
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = Math.max(...points.map((p) => p.y), 1);
  const niceMax = (() => {
    const mag = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / mag) * mag;
  })();
  const X = (i) => pad.l + (points.length < 2 ? iw / 2 : (i / (points.length - 1)) * iw);
  const Y = (v) => pad.t + ih - (v / niceMax) * ih;
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const area = `${d} L${X(points.length - 1)},${pad.t + ih} L${X(0)},${pad.t + ih} Z`;
  const ticks = [0, 0.5, 1].map((f) => niceMax * f);
  const xi = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left - pad.l;
    const i = Math.round((x / iw) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };

  return (
    <figure className="d-chart" ref={ref}>
      <svg width={w} height={height} role="img" aria-label={label} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="d-chart__grid" x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} />
            <text className="d-chart__tick" x={pad.l - 8} y={Y(t)} dy="0.32em" textAnchor="end">{format(t, true)}</text>
          </g>
        ))}
        {xi.map((i) => points[i] && (
          <text key={i} className="d-chart__tick" x={X(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>
            {points[i].x}
          </text>
        ))}
        <path className="d-chart__area" d={area} />
        <path className="d-chart__line" d={d} />
        {hover != null && (
          <g>
            <line className="d-chart__cross" x1={X(hover)} x2={X(hover)} y1={pad.t} y2={pad.t + ih} />
            <circle className="d-chart__dot" cx={X(hover)} cy={Y(points[hover].y)} r="4.5" />
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="d-chart__tip" style={{ left: Math.min(Math.max(X(hover), 70), w - 70) }}>
          <span>{points[hover].x}</span>
          <strong>{format(points[hover].y)}</strong>
        </div>
      )}
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

/** Batang horizontal satu warna; identitas dibawa label, bukan warna. */
export function BarList({ rows, format }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="d-bars">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)}`}>
          <span className="d-bars__label">{r.label}</span>
          <span className="d-bars__track" aria-hidden="true">
            <span className="d-bars__fill" style={{ "--w": r.value / max }} />
          </span>
          <span className="d-bars__value">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}
