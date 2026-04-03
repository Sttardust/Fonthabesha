/**
 * SkipLink — visually hidden "Skip to main content" link.
 * Becomes visible on :focus, giving keyboard users a shortcut past
 * the navigation bar. Place as the very first child of <body>.
 */
export default function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  );
}
