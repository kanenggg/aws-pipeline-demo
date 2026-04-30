// components/TabButton.tsx
interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export default function TabButton({
  label,
  isActive,
  onClick,
}: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
    text-sm px-3 py-2
    ${
      isActive
        ? "text-orange-400 border-b-2 border-orange-400 pb-1"
        : "text-black"
    } 
    hover:text-orange-400 transition-colors duration-200 cursor-pointer
  `}
    >
      {label}
    </button>
  );
}
