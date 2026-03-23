export default function Loading() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#f5f7fb]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/plan%20image.webp')" }}
      />
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" />
    </div>
  );
}
