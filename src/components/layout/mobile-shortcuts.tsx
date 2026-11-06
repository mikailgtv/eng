import Link from "next/link";

/** Touch-friendly quick links presented as a single horizontal strip on compact screens. */
export function MobileShortcuts({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav aria-label="Shortcuts" className="mb-5 lg:hidden">
      <ul className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.href} className="shrink-0 snap-start">
            <Link href={item.href} className="flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
