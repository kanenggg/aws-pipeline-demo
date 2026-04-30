import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  // 💡 Add optional onClick handler
  onClick?: () => void;
}
export default function NavLink({ href, children, onClick }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`p-3 block font-extralight transition-all duration-200 transform hover:translate-x-2
        ${
          isActive
            ? "text-orange-400 shadow-xl rounded-b-md translate-x-2"
            : "text-black hover:text-orange-400 hover:shadow-2xl hover:rounded-b-md"
        }`}
    >
      {children}
    </Link>
  );
}
