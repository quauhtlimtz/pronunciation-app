export function Footer() {
  const linkClass = "text-gray-300 dark:text-gray-600 no-underline border-b border-gray-200 dark:border-gray-700/50 hover:text-gray-400 dark:hover:text-gray-500 transition-colors";
  return (
    <div className="pt-4 pb-5 mt-auto">
      <p className="font-mono text-xs text-gray-300 dark:text-gray-600">
        By{" "}
        <a href="https://www.linkedin.com/in/quauhtlimtz" target="_blank" rel="noopener noreferrer" className={linkClass}>
          <span className="sm:hidden">Quauhtli</span>
          <span className="hidden sm:inline">Quauhtli Martínez</span>
        </a>
      </p>
    </div>
  );
}
