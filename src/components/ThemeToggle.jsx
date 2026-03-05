import { SunIcon, MoonIcon } from "@heroicons/react/20/solid";

export function ThemeToggle({ dark, setDark }) {
  // Determine what's currently showing (accounting for system preference)
  const isDarkNow = dark === true || (dark === null && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <button
      className="btn btn-default !px-3 !py-2 leading-none shrink-0"
      onClick={() => setDark(isDarkNow ? false : true)}
      title={isDarkNow ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDarkNow ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  );
}
