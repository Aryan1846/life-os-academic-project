export function EclipseBackground() {
  return (
    <div
      className="pointer-events-none absolute top-0 left-0 right-0 h-64 overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Cosmic Crimson Nebula Gradient */}
      <div className="absolute top-[-80px] right-[10%] w-[550px] h-[320px] rounded-full bg-gradient-to-b from-[#8B0D18]/35 via-[#4A070D]/20 to-transparent blur-3xl opacity-80" />
      <div className="absolute top-[-100px] right-[25%] w-[400px] h-[260px] rounded-full bg-gradient-to-r from-[#B31222]/20 via-[#630911]/15 to-transparent blur-2xl opacity-60" />

      {/* Berserk Celestial Eclipse */}
      <div className="absolute top-[-20px] right-[16%] md:right-[22%] w-36 h-36 md:w-48 md:h-48">
        {/* Outer Crimson Corona Flare */}
        <div className="absolute inset-0 rounded-full bg-[#8B0D18] blur-xl opacity-70 animate-pulse" />
        {/* Crescent Flare */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-[#FF2E42] via-[#8B0D18] to-transparent opacity-85 blur-sm" />
        {/* Dark Celestial Disc Core */}
        <div className="absolute inset-2 rounded-full bg-[#080808] border border-[#3A070C]/50 shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]" />
        {/* Crescent Ring Edge Accent */}
        <div className="absolute top-1 right-2 w-full h-full rounded-full border-t-2 border-r-2 border-[#FF4D5E] opacity-90 blur-[0.5px]" />
      </div>

      {/* Subtle fine cosmic dust / embers */}
      <div className="absolute top-4 right-[12%] w-1.5 h-1.5 rounded-full bg-[#FF4D5E] blur-[0.5px] opacity-75" />
      <div className="absolute top-12 right-[32%] w-1 h-1 rounded-full bg-[#E8A5AC] blur-[0.5px] opacity-60" />
      <div className="absolute top-20 right-[18%] w-1 h-1 rounded-full bg-[#A39168] blur-[0.5px] opacity-50" />
    </div>
  );
}
