import { SunIcon, MoonIcon } from "@heroicons/react/20/solid";

export function ThemeToggle({ dark, setDark }) {
  // Determine what's currently showing (accounting for system preference)
  const isDarkNow = dark === true || (dark === null && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <button
      className="p-2 rounded cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 active:opacity-50 transition-colors shrink-0"
      onClick={() => setDark(isDarkNow ? false : true)}
      title={isDarkNow ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDarkNow ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  );
}
