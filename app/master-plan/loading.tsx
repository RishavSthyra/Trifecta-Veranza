export default function MasterPlanLoading() {
  return (
    <section className="relative app-screen w-full overflow-hidden bg-black">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://cdn.sthyra.com/images/first_frame.webp')",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.14),rgba(0,0,0,0.30))]" />
    </section>
  );
}
