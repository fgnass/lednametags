import { currentBank, bankHasData, memoryUsage, memoryPercent } from "../store";
import { Microchip } from "lucide-preact";
import Select from "./Select";

export default function BankSelector() {
  return (
    <div class="flex items-center gap-4">
      <Select
        value={currentBank.value}
        onChange={(e) => currentBank.value = parseInt(e.target.value)}
        className="px-6 py-3 w-48"
      >
        {Array(8).fill().map((_, i) => (
          <option key={i} value={i} class="flex items-center gap-2">
            {bankHasData.value[i] ? "●" : "○"} Bank {i + 1}
          </option>
        ))}
      </Select>

      <div class="flex items-center gap-1 text-gray-400 text-sm">
        <Microchip class="w-4 h-4" />
        <div class="tabular-nums">
          {memoryUsage.value} bytes ({100 - memoryPercent.value}% free)
        </div>
      </div>
    </div>
  );
} 