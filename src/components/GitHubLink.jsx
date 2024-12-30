import { Github } from "lucide-preact";

export default function GitHubLink() {
  return (
    <a
      href="https://github.com/fgnass/lednametags"
      target="_blank"
      class="text-gray-500 hover:text-gray-300 px-2"
    >
      <Github />
    </a>
  );
}
