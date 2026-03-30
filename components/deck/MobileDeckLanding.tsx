"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BedDouble,
  Building2,
  Compass,
  Expand,
  Home,
  Landmark,
  Sparkles,
  Trees,
} from "lucide-react";
import CoverHero from "@/assets/Aparttments_Clouds.png";
import OverviewHero from "@/assets/veranza.webp";
import { unitPlans } from "@/data/unitPlans";

type ChartPoint = {
  name: string;
  value: number;
};

type ChartKey = "lifestyle" | "experience" | "residences";

type TooltipProps = {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { name: string; value: number };
  }>;
  label?: string;
};

const softCardClass =
  "rounded-[28px] border border-white/45 bg-[linear-gradient(180deg,rgba(255,251,244,0.94),rgba(247,238,225,0.9))] shadow-[0_16px_42px_rgba(90,62,24,0.1)]";

const statCards = [
  {
    title: "6+ Acres",
    subtitle: "Open & green living canvas",
    icon: <Trees className="h-4 w-4" />,
  },
  {
    title: "2 Towers",
    subtitle: "Iconic skyline presence",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    title: "G + 36",
    subtitle: "Elevated urban living",
    icon: <Landmark className="h-4 w-4" />,
  },
  {
    title: "444 Homes",
    subtitle: "Private, exclusive inventory",
    icon: <Home className="h-4 w-4" />,
  },
];

const chartViews: Record<ChartKey, ChartPoint[]> = {
  lifestyle: [
    { name: "Arrival", value: 68 },
    { name: "Landscape", value: 74 },
    { name: "Amenities", value: 81 },
    { name: "Recreation", value: 86 },
    { name: "Wellness", value: 91 },
    { name: "Sky Living", value: 96 },
    { name: "Privacy", value: 93 },
    { name: "Overall", value: 98 },
  ],
  experience: [
    { name: "Masterplan", value: 62 },
    { name: "Clubhouse", value: 70 },
    { name: "Pool Deck", value: 79 },
    { name: "Green Zones", value: 88 },
    { name: "Sports", value: 85 },
    { name: "Family Spaces", value: 92 },
    { name: "Views", value: 95 },
    { name: "Signature", value: 97 },
  ],
  residences: [
    { name: "2 BHK", value: 58 },
    { name: "3 BHK", value: 67 },
    { name: "East Facing", value: 76 },
    { name: "West Facing", value: 83 },
    { name: "North Facing", value: 80 },
    { name: "Large Balconies", value: 91 },
    { name: "Layout Flow", value: 94 },
    { name: "Liveability", value: 96 },
  ],
};

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#dbcdb7] bg-[#fffaf2]/95 px-3 py-2 shadow-xl">
      <p className="text-[10px] uppercase tracking-[0.24em] text-[#8f7f6d]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#221d19]">
        {payload[0].value}
      </p>
    </div>
  );
}

export default function MobileDeckLanding() {
  const [activeView, setActiveView] = useState<ChartKey>("lifestyle");
  const chartData = useMemo(() => chartViews[activeView], [activeView]);

  return (
    <article className="mx-auto w-full max-w-[860px] overflow-hidden rounded-t-[36px] bg-[linear-gradient(180deg,#f7f1e8_0%,#f4ebde_24%,#f9f4eb_56%,#f6efe2_100%)] shadow-[0_-8px_36px_rgba(95,62,22,0.1)] sm:rounded-t-[42px]">
      <section className="relative overflow-hidden px-5 pb-0 pt-8 sm:px-7 sm:pt-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top_right,rgba(255,248,236,0.96),rgba(255,248,236,0.72)_34%,rgba(214,180,123,0.14)_68%,transparent_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(180deg,rgba(232,213,184,0)_0%,rgba(224,198,152,0.22)_100%)]" />
        <div className="relative z-10 max-w-[75%] sm:max-w-[58%]">
          <p className="text-[11px] uppercase tracking-[0.42em] text-[#7f6b58]">
            Luxury Living
          </p>
          <h1 className="mt-3 text-[2.45rem] font-semibold leading-[0.92] tracking-[-0.05em] text-[#171411] sm:text-[3.35rem]">
            The New
            <br />
            Standard of
            <br />
            Refined Urban
            <br />
            Living
          </h1>
          <p className="mt-4 max-w-[22rem] text-[15px] leading-7 text-[#5f554c]">
            A premium residential experience crafted with timeless
            architecture, elegant interiors, and elevated lifestyle spaces.
          </p>
        </div>

        <div className="relative mt-8 h-[22rem] w-full sm:mt-10 sm:h-[30rem]">
          <div className="pointer-events-none absolute inset-x-[3%] bottom-[3%] top-[10%] rounded-[80px] bg-[radial-gradient(circle_at_center,rgba(76,53,31,0.16),rgba(76,53,31,0)_72%)] blur-3xl" />
          <Image
            src={CoverHero}
            alt="Trifecta Veranza towers"
            fill
            priority
            sizes="(max-width: 780px) 100vw, 780px"
            className="object-contain object-bottom scale-[1.16] sm:scale-[1.24]"
          />
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/35">
        <div className="relative aspect-[1.06] min-h-[18rem] w-full sm:aspect-[1.34] sm:min-h-[24rem]">
          <Image
            src={OverviewHero}
            alt="Project overview"
            fill
            sizes="(max-width: 780px) 100vw, 780px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,13,8,0.04),rgba(18,13,8,0)_30%,rgba(18,13,8,0.18)_100%)]" />
        </div>

        <div className="px-5 py-8 sm:px-7 sm:py-10">
          <p className="text-[11px] uppercase tracking-[0.42em] text-[#7f6b58]">
            Project Overview
          </p>
          <h2 className="mt-3 text-[2.3rem] font-semibold leading-[0.94] tracking-[-0.05em] text-[#171411] sm:text-[3rem]">
            Open to sky,
            <br />
            rooted in green.
          </h2>
          <p className="mt-4 max-w-[32rem] text-[15px] leading-8 text-[#5f554c]">
            A premium skyrise address designed around openness, landscape,
            elevation, and a richer everyday living experience.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
            {statCards.map((item) => (
              <div
                key={item.title}
                className={`${softCardClass} p-4`}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfcd] bg-[#faf5ec] text-[#57483c]">
                  {item.icon}
                </div>
                <div className="text-[1.8rem] font-semibold leading-none tracking-[-0.05em] text-[#1d1814]">
                  {item.title}
                </div>
                <p className="mt-2 text-[13px] leading-6 text-[#786c61]">
                  {item.subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#e5d9c8] bg-[linear-gradient(180deg,rgba(184,104,114,0.1),rgba(255,251,244,0.76)_20%,rgba(255,251,244,0.96)_100%)] px-5 py-8 sm:px-7 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.42em] text-[#8a7562]">
              Master Narrative
            </p>
            <h3 className="mt-2 text-[1.65rem] font-semibold leading-tight tracking-[-0.04em] text-[#1d1814] sm:text-[2rem]">
              A premium story told through landscape, amenity depth, and residence quality.
            </h3>
          </div>
          <div className="hidden rounded-full border border-[#dfcfb9] bg-white/70 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[#8a7562] sm:block">
            Page 4
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-2.5">
          {(
            [
              ["lifestyle", "Lifestyle curve"],
              ["experience", "Experience index"],
              ["residences", "Residence appeal"],
            ] as [ChartKey, string][]
          ).map(([key, label]) => {
            const isActive = activeView === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveView(key)}
                className={`rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.24em] transition ${
                  isActive
                    ? "bg-[#1d1814] text-white shadow-lg"
                    : "border border-[#ddd1bf] bg-white/72 text-[#6f6256]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className={`${softCardClass} mt-6 p-4 sm:p-5`}>
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#8f7f6d]">
              Signature Performance
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1d1814]">
              {activeView === "lifestyle" && "Landscape-led living score"}
              {activeView === "experience" && "Holistic amenity experience"}
              {activeView === "residences" && "Home configuration desirability"}
            </h3>
          </div>

          <div className="h-[18rem] w-full sm:h-[22rem]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="mobileOverviewFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ab5f68" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#ab5f68" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e7ddcf" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#7d6d5d", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "#7d6d5d", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={34}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#ab5f68"
                  strokeWidth={3}
                  fill="url(#mobileOverviewFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="px-5 py-8 sm:px-7 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.42em] text-[#8a7562]">
              Signature Residences
            </p>
            <h3 className="mt-2 text-[1.7rem] font-semibold leading-tight tracking-[-0.04em] text-[#1d1814] sm:text-[2.15rem]">
              Every apartment type, dimensions, and furnished view in one continuous mobile story.
            </h3>
          </div>
          <div className="hidden rounded-full border border-[#dfcfb9] bg-white/72 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[#8a7562] sm:block">
            Page 5 Onwards
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-6">
          {unitPlans.map((plan, index) => (
            <section
              key={plan.id}
              className="overflow-hidden rounded-[30px] border border-[#d8c2b4] bg-[linear-gradient(180deg,rgba(179,106,116,0.96)_0%,rgba(179,106,116,0.96)_33%,rgba(255,250,244,0.98)_33%,rgba(248,242,234,0.98)_100%)] shadow-[0_20px_50px_rgba(90,62,24,0.12)]"
            >
              <div className="px-5 pb-6 pt-6 text-white sm:px-6 sm:pt-7">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-white/88">
                    <Home className="h-3.5 w-3.5" />
                    Unit Plan
                  </div>
                  <div className="rounded-full border border-white/18 bg-white/8 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/72">
                    Page {5 + index * 2}-{6 + index * 2}
                  </div>
                </div>

                <h4 className="mt-5 text-[2.1rem] font-semibold leading-none tracking-[-0.05em] sm:text-[2.6rem]">
                  {plan.series}
                </h4>
                <p className="mt-3 max-w-[34rem] text-[15px] leading-7 text-white/88">
                  {plan.description}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 text-white/92">
                  <div className="rounded-[22px] border border-white/14 bg-white/8 p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/58">
                      Tower Series
                    </p>
                    <p className="mt-2 text-[1.05rem] font-semibold leading-7">
                      {plan.towerA}
                    </p>
                    {plan.towerB ? (
                      <p className="text-[1.05rem] font-semibold leading-7">
                        {plan.towerB}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-[22px] border border-white/14 bg-white/8 p-4">
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-white/72" />
                      <span className="text-sm font-medium">{plan.bhk}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Compass className="h-4 w-4 text-white/72" />
                      <span className="text-sm font-medium">{plan.facing}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Expand className="h-4 w-4 text-white/72" />
                      <span className="text-sm font-medium">
                        {plan.areaLabel}: {plan.areaValue}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 border-t border-[#ecdccf] px-4 pb-4 pt-5 sm:px-5 sm:pb-5">
                <div className={`${softCardClass} overflow-hidden p-3`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#8f7f6d]">
                      2D Layout
                    </p>
                    <div className="rounded-full border border-[#e4d8c9] bg-[#faf4eb] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#7b6a5c]">
                      Plan View
                    </div>
                  </div>
                  <div className="relative aspect-[1.08] w-full">
                    <Image
                      src={plan.image2D}
                      alt={`${plan.series} 2D plan`}
                      fill
                      sizes="(max-width: 780px) 100vw, 720px"
                      className="object-contain"
                    />
                  </div>
                </div>

                <div className={`${softCardClass} overflow-hidden p-3`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#8f7f6d]">
                      Furnished 3D View
                    </p>
                    <div className="rounded-full border border-[#e4d8c9] bg-[#faf4eb] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#7b6a5c]">
                      Spatial Mood
                    </div>
                  </div>
                  <div className="relative aspect-[1.08] w-full">
                    <Image
                      src={plan.image3D}
                      alt={`${plan.series} 3D plan`}
                      fill
                      sizes="(max-width: 780px) 100vw, 720px"
                      className="object-contain scale-[1.02]"
                    />
                  </div>
                </div>

                <div className={`${softCardClass} p-4`}>
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#a86a72]" />
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#8f7f6d]">
                      Layout Dimensions
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {plan.specs.map((spec, specIndex) => (
                      <div
                        key={`${plan.id}-${spec.name}-${specIndex}`}
                        className="rounded-[18px] border border-[#e3d6c5] bg-white/78 px-3.5 py-3 shadow-[0_8px_18px_rgba(90,62,24,0.04)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#ad9c8b]">
                              Space
                            </p>
                            <h5 className="mt-2 text-[14px] font-semibold leading-5 text-[#221d19]">
                              {spec.name}
                            </h5>
                          </div>
                          <div className="shrink-0 rounded-full border border-[#e4d8c9] bg-[#faf4eb] px-2.5 py-1.5 text-[10px] font-medium text-[#5f5448]">
                            {spec.size}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="border-t border-white/35 px-5 py-12 text-center sm:px-7 sm:py-16">
        <div className="mx-auto max-w-[360px]">
          <div className="relative mx-auto aspect-[5.2/2.1] w-full">
            <Image
              src="/Logo_Trifect_Veranza.png"
              alt="Trifecta Veranza"
              fill
              priority
              sizes="360px"
              className="object-contain"
            />
          </div>
        </div>
        <p className="mt-6 text-[11px] uppercase tracking-[0.42em] text-[#8a7562]">
          Off Sarjapur Road
        </p>
        <h3 className="mt-4 text-[2rem] font-light tracking-[-0.04em] text-[#4f433d] sm:text-[2.5rem]">
          Open to sky, rooted in green.
        </h3>
      </section>
    </article>
  );
}
