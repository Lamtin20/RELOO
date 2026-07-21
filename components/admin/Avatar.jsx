export function Avatar({ name = "?", src, size = 36 }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} />
      ) : (
        initials
      )}
    </div>
  );
}
