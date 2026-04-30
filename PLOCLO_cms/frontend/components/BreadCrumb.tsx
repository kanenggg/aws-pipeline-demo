import Link from "next/link"; // Recommended for Next.js navigation

export default function BreadCrumb({
  items,
}: {
  items: { label: string | number; href?: string }[];
}) {
  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {/* Optional: Home Icon Start (You can add this if you like) */}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="inline-flex items-center">
              {/* Separator Icon (Don't show for first item) */}
              {index > 0 && (
                <svg
                  className="w-3 h-3 text-gray-400 mx-1"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 6 10"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 9 4-4-4-4"
                  />
                </svg>
              )}

              {/* Breadcrumb Item */}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={`inline-flex items-center text-sm font-normal text-gray-700 hover:text-orange-600 hover:underline transition-colors ${
                    index > 0 ? "ml-1 md:ml-2" : ""
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`inline-flex items-center text-sm font-light text-gray-500 ${
                    index > 0 ? "ml-1 md:ml-2" : ""
                  }`}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
