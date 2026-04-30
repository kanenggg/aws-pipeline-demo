import { FaEye, FaEyeSlash } from "react-icons/fa";


interface ToggleButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}

export const ToggleButton = ({ label, active, onClick, color }: ToggleButtonProps) => (
  <button
    onClick={onClick}
    style={{
      backgroundColor: active ? color : "white",
      borderColor: color,
      color: active ? "white" : "black",
    }}
    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-light transition-all border shadow-sm"
  >
    {active ? <FaEye size={12} /> : <FaEyeSlash size={12} />}
    {label}
  </button>
);
