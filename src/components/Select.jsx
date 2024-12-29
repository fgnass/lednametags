import { ChevronDown } from "lucide-preact";

export default function Select({ value, onChange, children, className = "" }) {
  return (
    <div class="relative">
      <select
        value={value}
        onChange={onChange}
        class={`appearance-none pr-12 ${className} bg-gray-800 rounded-lg hover:bg-gray-700`}
      >
        {children}
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
        <ChevronDown class="w-5 h-5" />
      </div>
    </div>
  );
} 