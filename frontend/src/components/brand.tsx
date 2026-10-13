import { TrendingUp } from "lucide-react";

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <TrendingUp size={21} strokeWidth={2.5} />
      </span>
      LeadFlow<span className="brand-dot">.</span>
    </span>
  );
}
