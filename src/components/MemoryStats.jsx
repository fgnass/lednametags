import { memoryUsage, memoryPercent } from "../store";
import { Microchip } from "lucide-preact";

export default function MemoryStats() {
  return (
    <div class="flex items-center gap-1 text-gray-400 text-sm">
      <Microchip class="w-4 h-4" />
      <div class="tabular-nums">
        {memoryUsage.value} bytes ({100 - memoryPercent.value}% free)
      </div>
    </div>
  );
}
