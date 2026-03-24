export default function Loading() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/FALLBACK.png')" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_34%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
