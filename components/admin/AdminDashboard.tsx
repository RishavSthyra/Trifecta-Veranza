"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import {
  BarChart3,
  Building2,
  CircleDot,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Search,
  ShieldCheck,
  Sparkles,
  TowerControl,
  UserCircle2,
} from "lucide-react";
import { Bar, Doughnut } from "react-chartjs-2";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useCursorGlow } from "@/lib/useCursorGlow";
import { cn } from "@/lib/utils";
import type {
  InventoryAdminRow,
  InventoryStatus,
  TowerType,
} from "@/types/inventory";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  Tooltip,
);

type AdminDashboardProps = {
  initialInventory: InventoryAdminRow[];
};

type InventorySummary = {
  total: number;
  available: number;
  reserved: number;
  sold: number;
};

const statusOptions: InventoryStatus[] = ["Available", "Reserved", "Sold"];
const towerFilters: Array<"All" | TowerType> = ["All", "Tower A", "Tower B"];

const statusTheme: Record<
  InventoryStatus,
  {
    solid: string;
    pill: string;
  }
> = {
  Available: {
    solid: "rgba(52, 211, 153, 0.92)",
    pill: "border-emerald-400/18 bg-emerald-400/10 text-emerald-200",
  },
  Reserved: {
    solid: "rgba(251, 191, 36, 0.92)",
    pill: "border-amber-400/18 bg-amber-400/10 text-amber-200",
  },
  Sold: {
    solid: "rgba(251, 113, 133, 0.92)",
    pill: "border-rose-400/18 bg-rose-400/10 text-rose-200",
  },
};

const cursorGlowDefaults: CSSProperties = {
  ["--glow-x" as string]: "50%",
  ["--glow-y" as string]: "50%",
  ["--glow-opacity" as string]: "0",
} as CSSProperties;

const doughnutOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "74%",
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        color: "rgba(255,255,255,0.76)",
        font: {
          family: "var(--font-open)",
        },
        padding: 18,
        usePointStyle: true,
        pointStyle: "circle",
      },
    },
    tooltip: {
      backgroundColor: "rgba(10,11,15,0.96)",
      borderColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      bodyColor: "rgba(255,255,255,0.88)",
      titleColor: "rgba(255,255,255,0.96)",
      displayColors: true,
    },
  },
};

const barOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index",
    intersect: false,
  },
  plugins: {
    legend: {
      position: "top",
      align: "start",
      labels: {
        color: "rgba(255,255,255,0.76)",
        font: {
          family: "var(--font-open)",
        },
        padding: 16,
        usePointStyle: true,
        pointStyle: "circle",
      },
    },
    tooltip: {
      backgroundColor: "rgba(10,11,15,0.96)",
      borderColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      bodyColor: "rgba(255,255,255,0.88)",
      titleColor: "rgba(255,255,255,0.96)",
    },
  },
  scales: {
    x: {
      stacked: true,
      grid: {
        display: false,
      },
      ticks: {
        color: "rgba(255,255,255,0.44)",
        font: {
          family: "var(--font-open)",
        },
      },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      border: {
        display: false,
      },
      grid: {
        color: "rgba(255,255,255,0.08)",
      },
      ticks: {
        color: "rgba(255,255,255,0.44)",
        precision: 0,
        stepSize: 1,
        font: {
          family: "var(--font-open)",
        },
      },
    },
  },
};

function summarizeInventory(units: InventoryAdminRow[]): InventorySummary {
  return {
    total: units.length,
    available: units.filter((unit) => unit.status === "Available").length,
    reserved: units.filter((unit) => unit.status === "Reserved").length,
    sold: units.filter((unit) => unit.status === "Sold").length,
  };
}

function getShare(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function parseFloorValue(value: string) {
  if (value.toUpperCase() === "G") return 0;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatFloorLabel(value: string) {
  return value.toUpperCase() === "G" ? "Ground" : `Floor ${value}`;
}

export default function AdminDashboard({
  initialInventory,
}: AdminDashboardProps) {
  const router = useRouter();
  const glowRootRef = useRef<HTMLDivElement | null>(null);
  const [inventory, setInventory] = useState(initialInventory);
  const [selectedTower, setSelectedTower] = useState<"All" | TowerType>("All");
  const [searchValue, setSearchValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useCursorGlow(glowRootRef, { radius: 200 });

  const filteredInventory = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return inventory.filter((unit) => {
      const matchesTower =
        selectedTower === "All" || unit.tower === selectedTower;

      if (!matchesTower) return false;
      if (!normalizedSearch) return true;

      const haystack = [
        unit.flatNumber,
        unit.tower,
        unit.floor,
        unit.bhk,
        unit.facing,
        unit.status,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [inventory, searchValue, selectedTower]);

  const activeSummary = useMemo(
    () => summarizeInventory(filteredInventory),
    [filteredInventory],
  );

  const floorChart = useMemo(() => {
    const floors = Array.from(
      new Set(filteredInventory.map((unit) => unit.floor)),
    ).sort((left, right) => parseFloorValue(left) - parseFloorValue(right));

    return {
      labels: floors.map(formatFloorLabel),
      datasets: statusOptions.map((status) => ({
        label: status,
        data: floors.map(
          (floor) =>
            filteredInventory.filter(
              (unit) => unit.floor === floor && unit.status === status,
            ).length,
        ),
        backgroundColor: statusTheme[status].solid,
        borderRadius: 10,
        borderSkipped: false,
        maxBarThickness: 28,
      })),
    };
  }, [filteredInventory]);

  const availabilityChart = useMemo(
    () => ({
      labels: statusOptions,
      datasets: [
        {
          data: statusOptions.map((status) =>
            status === "Available"
              ? activeSummary.available
              : status === "Reserved"
                ? activeSummary.reserved
                : activeSummary.sold,
          ),
          backgroundColor: statusOptions.map(
            (status) => statusTheme[status].solid,
          ),
          borderColor: "rgba(8,9,12,0.88)",
          borderWidth: 4,
          hoverOffset: 8,
        },
      ],
    }),
    [activeSummary],
  );

  const towerBreakdown = useMemo(
    () =>
      towerFilters.slice(1).map((tower) => {
        const units = inventory.filter((unit) => unit.tower === tower);
        return {
          tower,
          summary: summarizeInventory(units),
        };
      }),
    [inventory],
  );

  const occupancyRate = activeSummary.total
    ? Math.round(
        ((activeSummary.reserved + activeSummary.sold) / activeSummary.total) *
          100,
      )
    : 0;

  const scopeLabel =
    selectedTower === "All"
      ? "All towers in scope"
      : `${selectedTower} in scope`;

  const handleStatusChange = async (id: string, status: InventoryStatus) => {
    const previousInventory = inventory;

    setError(null);
    setSavingId(id);
    setInventory((current) =>
      current.map((unit) => (unit.id === id ? { ...unit, status } : unit)),
    );

    try {
      const response = await fetch(`/api/admin/inventory/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to update status.");
      }
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : "Unable to update inventory status.";
      setError(message);
      setInventory(previousInventory);
    } finally {
      setSavingId(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    startTransition(() => {
      router.push("/admin/login");
      router.refresh();
    });
  };

  return (
    <div
      ref={glowRootRef}
      className="min-h-dvh overflow-hidden bg-[#08090c] text-white"
    >
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-140px] top-[-110px] h-[360px] w-[360px] rounded-full bg-[#c9a96b]/12 blur-3xl" />
        <div className="absolute right-[-90px] top-[8%] h-[340px] w-[340px] rounded-full bg-[#b08d57]/10 blur-3xl" />
        <div className="absolute bottom-[-130px] left-[42%] h-[320px] w-[320px] rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative flex min-h-dvh flex-col xl:flex-row">
        <aside className="w-full shrink-0 xl:sticky xl:top-0 xl:h-auto xl:w-[290px]">
          <GlowPanel className="relative flex h-full flex-col overflow-hidden border border-white/10 bg-[#0b0c10]/94 px-5 py-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl xl:rounded-l-none xl:rounded-r-[34px] xl:border-l-0 sm:px-6 sm:py-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,188,136,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_38%,rgba(255,255,255,0.02))]" />

            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-[#d6bc88]/30 bg-[#d6bc88]/10 p-3 text-[#ecd7ae]">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[#d6bc88]">
                    Veranza Admin
                  </p>
                  <p className="mt-1 text-sm text-white/54">
                    Live inventory workspace
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <h1 className="font-[var(--font-sora)] text-[1.7rem] font-semibold tracking-[-0.05em] text-white">
                  Full-view control, lighter left rail.
                </h1>
                <p className="mt-3 text-[14px] leading-7 text-white/56">
                  Quick stats stay on the edge. The main workspace is now for
                  filters, charts, and flat status management.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <RailStrip
                  icon={<ShieldCheck className="h-4 w-4" />}
                  title="Protected Session"
                  description="Route guard and admin cookie are active."
                />
                <RailStrip
                  icon={<Sparkles className="h-4 w-4" />}
                  title="Live Sync"
                  description="Status edits update the master plan feed."
                />
              </div>

              <GlowSurface className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.26em] text-white/40">
                        Tower Mix
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        Clean read across both towers
                      </p>
                    </div>
                    <div className="rounded-full border border-[#d6bc88]/20 bg-[#d6bc88]/10 p-2 text-[#ecd7ae]">
                      <Building2 className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {towerBreakdown.map(({ tower, summary: towerSummary }) => (
                      <div
                        key={tower}
                        className="rounded-[20px] border border-white/8 bg-black/10 px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-white">
                            {tower}
                          </p>
                          <p className="text-xs text-white/42">
                            {towerSummary.total} units
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <MiniPill label="A" value={towerSummary.available} />
                          <MiniPill label="R" value={towerSummary.reserved} />
                          <MiniPill label="S" value={towerSummary.sold} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowSurface>

              <GlowSurface className="group mt-4 rounded-full border border-white/10 bg-white/[0.03] p-2">
                <div className="relative z-10 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d6bc88]/30 bg-[#d6bc88]/10 text-[#ecd7ae]">
                    <UserCircle2 className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      Admin Session
                    </p>
                    <p className="truncate text-xs text-white/42">
                      Hover for logout
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isPending}
                    className="inline-flex h-10 max-w-[140px] items-center justify-center gap-2 overflow-hidden rounded-full border border-[#d6bc88]/30 bg-[#d6bc88]/12 px-4 text-sm font-medium text-[#f1ddb6] opacity-100 transition-all duration-300 xl:max-w-0 xl:px-0 xl:opacity-0 xl:group-hover:max-w-[140px] xl:group-hover:px-4 xl:group-hover:opacity-100 xl:group-focus-within:max-w-[140px] xl:group-focus-within:px-4 xl:group-focus-within:opacity-100 disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" />
                    {isPending ? "Signing out" : "Logout"}
                  </button>
                </div>
              </GlowSurface>
            </div>
          </GlowPanel>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex h-full flex-col gap-4">
            <GlowPanel className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0b0f]/92 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(214,188,136,0.1),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_34%)]" />

              <div className="relative z-10 flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:px-8">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/34">
                      Visibility Desk
                    </p>
                    <h2 className="mt-3 font-[var(--font-sora)] text-[1.9rem] font-semibold tracking-[-0.05em] text-white">
                      Flat intelligence, cleaner workspace.
                    </h2>
                    <p className="mt-2 max-w-3xl text-[14px] leading-7 text-white/54">
                      The dashboard stays in the same visual system, but the
                      canvas is now focused on quick filtering, richer charts,
                      and faster inventory decisions.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <GlowSurface className="rounded-full border border-white/10 bg-white/[0.03]">
                      <label className="relative z-10 flex h-11 min-w-[220px] items-center gap-2 px-4">
                        <Search className="h-4 w-4 text-white/38" />
                        <input
                          value={searchValue}
                          onChange={(event) =>
                            setSearchValue(event.target.value)
                          }
                          placeholder="Search flat, floor, tower..."
                          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/28"
                        />
                      </label>
                    </GlowSurface>

                    <div className="flex flex-wrap gap-2">
                      {towerFilters.map((tower) => (
                        <FilterChip
                          key={tower}
                          isActive={selectedTower === tower}
                          onClick={() => setSelectedTower(tower)}
                        >
                          {tower}
                        </FilterChip>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <HeaderPill icon={<TowerControl className="h-3.5 w-3.5" />}>
                    {scopeLabel}
                  </HeaderPill>
                  <HeaderPill icon={<BarChart3 className="h-3.5 w-3.5" />}>
                    {activeSummary.total} flats matched
                  </HeaderPill>
                </div>
              </div>
            </GlowPanel>

            {error ? (
              <div className="rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              <MetricCard
                label="Units In Scope"
                value={activeSummary.total}
                detail={`${scopeLabel}`}
              />
              <MetricCard
                label="Available"
                value={activeSummary.available}
                detail={`${getShare(activeSummary.available, activeSummary.total)} ready to sell`}
              />
              <MetricCard
                label="Reserved"
                value={activeSummary.reserved}
                detail={`${getShare(activeSummary.reserved, activeSummary.total)} held in pipeline`}
              />
              <MetricCard
                label="Sold"
                value={activeSummary.sold}
                detail={`${getShare(activeSummary.sold, activeSummary.total)} fully closed`}
              />
            </div>

            <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
              <GlowPanel className="rounded-[32px] border border-white/10 bg-[#0a0b0f]/92 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.26em] text-white/34">
                      Status Split
                    </p>
                    <h3 className="mt-3 font-[var(--font-sora)] text-[1.3rem] font-semibold tracking-[-0.04em] text-white">
                      Availability mix
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      Hover each segment to inspect the live share of available,
                      reserved, and sold flats.
                    </p>
                  </div>
                  <div className="rounded-full border border-[#d6bc88]/20 bg-[#d6bc88]/10 p-2.5 text-[#ecd7ae]">
                    <CircleDot className="h-4 w-4" />
                  </div>
                </div>

                {activeSummary.total ? (
                  <div className="relative mt-6 h-[260px]">
                    <Doughnut
                      data={availabilityChart}
                      options={doughnutOptions}
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-white/34">
                          Occupied
                        </p>
                        <p className="mt-2 font-[var(--font-sora)] text-3xl font-semibold tracking-[-0.05em] text-white">
                          {occupancyRate}%
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyChartState message="No flats match the current filter." />
                )}
              </GlowPanel>

              <GlowPanel className="rounded-[32px] border border-white/10 bg-[#0a0b0f]/92 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.26em] text-white/34">
                      Floor Trends
                    </p>
                    <h3 className="mt-3 font-[var(--font-sora)] text-[1.3rem] font-semibold tracking-[-0.04em] text-white">
                      Status by floor
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      Stacked bars show where the active scope is still open,
                      reserved, or already closed.
                    </p>
                  </div>
                  <div className="rounded-full border border-[#d6bc88]/20 bg-[#d6bc88]/10 p-2.5 text-[#ecd7ae]">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                </div>

                {activeSummary.total ? (
                  <div className="custom-scrollbar mt-6 overflow-x-auto">
                    <div className="h-[280px] min-w-[640px]">
                      <Bar data={floorChart} options={barOptions} />
                    </div>
                  </div>
                ) : (
                  <EmptyChartState message="Charts will appear when flats match the current filter." />
                )}
              </GlowPanel>
            </div>

            <GlowPanel className="relative flex flex-1 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0b0f]/92 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_28%)]" />

              <div className="relative z-10 border-b border-white/10 px-5 py-5 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.26em] text-white/34">
                      Flat Inventory
                    </p>
                    <h3 className="mt-2 font-[var(--font-sora)] text-[1.45rem] font-semibold tracking-[-0.04em] text-white">
                      Editable unit status table
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      Only availability changes here. Flat metadata stays
                      untouched, so the public inventory remains stable.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusLegend status="Available" />
                    <StatusLegend status="Reserved" />
                    <StatusLegend status="Sold" />
                  </div>
                </div>
              </div>

              {filteredInventory.length ? (
                <div className="relative z-10 px-5 py-5 sm:px-6 sm:py-6 lg:px-8">
                  <GlowSurface className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.02]">
                    <div className="custom-scrollbar max-h-[48dvh] overflow-auto xl:max-h-[calc(100dvh-29rem)]">
                      <table className="min-w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-[#111317]/96 backdrop-blur-xl">
                          <tr className="border-b border-white/10">
                            <TableHead>Flat</TableHead>
                            <TableHead>Tower</TableHead>
                            <TableHead>Floor</TableHead>
                            <TableHead>BHK</TableHead>
                            <TableHead>Facing</TableHead>
                            <TableHead>Area</TableHead>
                            <TableHead>Status</TableHead>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInventory.map((unit) => (
                            <tr
                              key={unit.id}
                              className="border-b border-white/6 bg-transparent transition hover:bg-white/[0.025]"
                            >
                              <TableCell strong>
                                {(unit.flatNumber || "Unknown").toUpperCase()}
                              </TableCell>
                              <TableCell>{unit.tower}</TableCell>
                              <TableCell>{unit.floor}</TableCell>
                              <TableCell>{unit.bhk}</TableCell>
                              <TableCell>{unit.facing}</TableCell>
                              <TableCell>{unit.areaSqft} sqft</TableCell>
                              <td className="px-4 py-3 sm:px-5">
                                <div className="flex flex-wrap items-center gap-3">
                                  <StatusPill status={unit.status} />

                                  <GlowSurface className="rounded-[16px] border border-white/10 bg-white/[0.03]">
                                    <select
                                      value={unit.status}
                                      onChange={(event) =>
                                        handleStatusChange(
                                          unit.id,
                                          event.target.value as InventoryStatus,
                                        )
                                      }
                                      className="relative z-10 h-11 min-w-[140px] bg-transparent px-3.5 text-sm text-white outline-none"
                                    >
                                      {statusOptions.map((status) => (
                                        <option
                                          key={status}
                                          value={status}
                                          className="bg-[#111317] text-white"
                                        >
                                          {status}
                                        </option>
                                      ))}
                                    </select>
                                  </GlowSurface>

                                  {savingId === unit.id ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin text-[#d6bc88]" />
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </GlowSurface>
                </div>
              ) : (
                <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-10">
                  <EmptyChartState message="No flats matched the current search and tower filter." />
                </div>
              )}
            </GlowPanel>
          </div>
        </main>
      </div>
    </div>
  );
}

function GlowPanel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <GlowSurface className={cn("relative", className)} {...props}>
      {children}
    </GlowSurface>
  );
}

function GlowSurface({
  children,
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-cursor-glow
      {...props}
      style={{ ...cursorGlowDefaults, ...style }}
      className={cn("surface-contain relative overflow-hidden", className)}
    >
      <GlowBorder />
      {children}
    </div>
  );
}

function GlowBorder() {
  return (
    <span
      aria-hidden="true"
      className="glow-border-layer pointer-events-none absolute inset-0 rounded-[inherit] opacity-[var(--glow-opacity)] transition-opacity duration-150"
      style={{
        padding: "1px",
        background:
          "radial-gradient(170px circle at var(--glow-x) var(--glow-y), rgba(214,188,136,0.95), rgba(214,188,136,0.42) 28%, rgba(214,188,136,0.12) 50%, transparent 70%)",
        WebkitMask:
          "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }}
    />
  );
}

function RailStrip({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <GlowSurface className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <div className="relative z-10 flex items-start gap-3">
        <div className="rounded-full border border-[#d6bc88]/20 bg-[#d6bc88]/10 p-2 text-[#ecd7ae]">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-1 text-[13px] leading-6 text-white/52">
            {description}
          </p>
        </div>
      </div>
    </GlowSurface>
  );
}

function MiniPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/72">
      <span className="text-white/38">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </span>
  );
}

function HeaderPill({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white/68">
      <span className="text-[#ecd7ae]">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <GlowSurface className="rounded-[28px] border border-white/10 bg-[#0a0b0f]/92 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
      <div className="relative z-10">
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/36">
          {label}
        </p>
        <p className="mt-4 font-[var(--font-sora)] text-4xl font-semibold tracking-[-0.05em] text-white">
          {value}
        </p>
        <p className="mt-3 text-sm leading-6 text-white/50">{detail}</p>
      </div>
    </GlowSurface>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-white/[0.02] px-6 text-center text-sm leading-6 text-white/44">
      {message}
    </div>
  );
}

function FilterChip({
  children,
  isActive,
  onClick,
}: {
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-cursor-glow
      style={cursorGlowDefaults}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-full border px-4 py-2.5 text-[12px] font-medium transition",
        isActive
          ? "border-[#d6bc88]/38 bg-[#d6bc88]/12 text-[#f1ddb6]"
          : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.05]",
      )}
    >
      <GlowBorder />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function StatusLegend({ status }: { status: InventoryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
        statusTheme[status].pill,
      )}
    >
      <CircleDot className="h-3 w-3" />
      {status}
    </span>
  );
}

function StatusPill({ status }: { status: InventoryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
        statusTheme[status].pill,
      )}
    >
      <CircleDot className="h-3 w-3" />
      {status}
    </span>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-[0.24em] text-white/42 sm:px-5">
      {children}
    </th>
  );
}

function TableCell({
  children,
  strong = false,
}: {
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-4 text-[14px] text-white/58 sm:px-5",
        strong && "font-medium tracking-[0.04em] text-white",
      )}
    >
      {children}
    </td>
  );
}
