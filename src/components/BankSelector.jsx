import { currentBank, bankHasData } from "../store";
import Select from "./Select";

export default function BankSelector() {
  return (
    <Select
      value={currentBank.value}
      onChange={(e) => (currentBank.value = parseInt(e.target.value))}
    >
      {Array(8)
        .fill()
        .map((_, i) => (
          <option key={i} value={i} class="flex items-center gap-2">
            {bankHasData.value[i] ? "●" : "○"} Bank {i + 1}
          </option>
        ))}
    </Select>
  );
}
