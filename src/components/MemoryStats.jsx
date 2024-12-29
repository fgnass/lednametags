import { memoryUsage, memoryPercent } from "../store";
import { Database } from "lucide-preact";

export default function MemoryStats() {
  return (
    <div class="flex items-center gap-2 text-gray-400 text-sm">
      <Database class="w-4 h-4" />
      <div class="tabular-nums">
        {memoryUsage} bytes ({memoryPercent}%)
      </div>
    </div>
  );
} 