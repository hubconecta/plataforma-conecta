import { IC } from "./icons";

export default function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <svg className={`ico ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d={IC[name] || IC.grid} />
    </svg>
  );
}
