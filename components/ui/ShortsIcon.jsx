export function ShortsIcon({ size = 24, active = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M14.8 2.7c2-1.1 4.4-.4 5.4 1.5 1 1.9.3 4.2-1.6 5.3l-2.8 1.6 2.1 1.2c1.9 1.1 2.6 3.5 1.5 5.4-.4.7-.9 1.2-1.6 1.6l-8.6 4.1c-2 1-4.4.2-5.3-1.7-.9-1.8-.3-4 1.5-5.1l3-1.7-2.1-1.2C4.4 12.6 3.7 10.2 4.8 8.3c.4-.7.9-1.2 1.6-1.6l8.4-4Z" transform="translate(0 -1) scale(1 .96)" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="m10 8.8 5.1 3.1-5.1 3.2V8.8Z" fill={active ? "white" : "currentColor"}/>
    </svg>
  );
}
