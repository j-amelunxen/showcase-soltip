const GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-rose-500",
  "from-indigo-500 to-purple-500",
  "from-pink-500 to-red-500",
];

/** Deterministic gradient avatar, no uploads, no external images. */
export default function Avatar({
  name,
  seed,
  size = 80,
}: {
  name: string;
  seed: string;
  size?: number;
}) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const gradient = GRADIENTS[hash % GRADIENTS.length];
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br ${gradient} font-bold text-white`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}
