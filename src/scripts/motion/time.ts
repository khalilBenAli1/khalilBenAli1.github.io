/**
 * Live local clock — the cheapest possible proof that a specific person in a
 * specific place maintains this site right now.
 *
 *   <span data-local-time>--:--</span>
 *
 * Render a placeholder server-side so there is no empty flash and no CLS; the
 * `tabular-nums` rule in base.css keeps the digits from jittering.
 * Europe/Rome is hard-coded on purpose: it is a fact about Khalil, not a
 * property of the visitor.
 */
const TIME_ZONE = "Europe/Rome";
const INTERVAL_MS = 10_000;

export function initLocalTime(): void {
  const els = document.querySelectorAll<HTMLElement>("[data-local-time]");
  if (!els.length) return;

  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const tick = (): void => {
    const now = format.format(new Date());
    els.forEach((el) => {
      if (el.textContent !== now) el.textContent = now;
    });
  };

  tick();
  window.setInterval(tick, INTERVAL_MS);
}
