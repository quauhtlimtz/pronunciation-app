export function Footer() {
  const linkClass = "text-gray-500 dark:text-gray-400 no-underline border-b border-gray-400 dark:border-gray-500";
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-5 pb-6 mt-auto">
      <p className="font-mono text-sm text-gray-400 dark:text-gray-500 leading-loose">
        Developed by{" "}
        <a href="https://www.linkedin.com/in/quauhtlimtz" target="_blank" rel="noopener noreferrer" className={linkClass}>
          Quauhtli Martínez
        </a>
        {" · "}
        <a href="https://buymeacoffee.com/quauhtlimtz" target="_blank" rel="noopener noreferrer" className={linkClass}>
          Buy me a coffee
        </a>
      </p>
    </div>
  );
}
