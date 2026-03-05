export function Footer() {
  return (
    <div className="pt-4 pb-5 mt-auto">
      <div className="flex items-center gap-1.5 mb-1">
        <img src="/favicon.svg" alt="" className="w-3.5 h-3.5 opacity-40" />
        <span className="text-xs text-gray-300 dark:text-gray-600 tracking-tight">Pro<span className="font-light">ˈ</span>nunce</span>
      </div>
      <p className="font-mono text-xs text-gray-300 dark:text-gray-600">
        Hecho en Austin, TX
      </p>
    </div>
  );
}
