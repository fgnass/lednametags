import { ChevronDown } from "lucide-preact";

export default function Select({ value, onChange, children }) {
  return (
    <div class="relative flex">
      <select
        value={value}
        onChange={onChange}
        class={`appearance-none px-6 py-3 pr-12 bg-gray-800 rounded-lg hover:bg-gray-600`}
      >
        {children}
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
        <ChevronDown class="w-5 h-5" />
      </div>
    </div>
  );
}
