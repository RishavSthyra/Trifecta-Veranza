"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import poidata from "@/data/poi.json"
import Image from "next/image";
import { Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  MapControls,
  useMap,
  MapRoute,
  type MapRef,
} from "@/components/ui/map";
import {
  Loader2,
  Trees,
  BusFront,
  ShoppingBag,
  Building2,
  GraduationCap,
  Hospital,
  Landmark,
  Search,
  MapPinned,
  X,
  Layers,
} from "lucide-react";
import { MdKeyboardArrowLeft } from "react-icons/md";

const styles = {
  default: undefined,
  openstreetmap: "https://tiles.openfreemap.org/styles/bright",
  openstreetmap3d: "https://tiles.openfreemap.org/styles/liberty",
};

type StyleKey = keyof typeof styles;

type RouteData = {
  id: number;
  name: string;
  coordinates: [number, number][];
  duration: number;
  distance: number;
};

type PoiCategory =
  | "park"
  | "mall"
  | "bus_stop"
  | "school"
  | "hospital"
  | "landmark"
  | "IT Company";

export type Poi = {
  id: number;
  name: string;
  category: PoiCategory;
  lng: number;
  lat: number;
  distanceLabel: string;
  timeLabel: string;
  rating?: number;
  featured?: boolean;
  image?: string;
};

const centerPlace = {
  name: "Trifecta Veranza.",
  lng: 77.75138250386782,
  lat: 12.863519959225334,
};

const pois : Poi[] = poidata as Poi[];

const geojsonData = {
  type: "FeatureCollection" as const,
  // features: [
  //   {
  //     type: "Feature" as const,
  //     properties: { name: "Project Green Belt", type: "park" },
  //     geometry: {
  //       type: "Polygon" as const,
  //       coordinates: [
  //         [
  //           [77.7487, 12.8647],
  //           [77.7514, 12.8658],
  //           [77.7532, 12.8649],
  //           [77.7521, 12.8628],
  //           [77.7494, 12.8629],
  //           [77.7487, 12.8647],
  //         ],
  //       ],
  //     },
  //   },
  //   {
  //     type: "Feature" as const,
  //     properties: { name: "Lakefront Open Park", type: "park" },
  //     geometry: {
  //       type: "Polygon" as const,
  //       coordinates: [
  //         [
  //           [77.7584, 12.8637],
  //           [77.7604, 12.8645],
  //           [77.7612, 12.8628],
  //           [77.7596, 12.8617],
  //           [77.7579, 12.8624],
  //           [77.7584, 12.8637],
  //         ],
  //       ],
  //     },
  //   },
  //   {
  //     type: "Feature" as const,
  //     properties: { name: "Retail Growth Corridor", type: "commercial" },
  //     geometry: {
  //       type: "Polygon" as const,
  //       coordinates: [
  //         [
  //           [77.7547, 12.8652],
  //           [77.7579, 12.8654],
  //           [77.7584, 12.8634],
  //           [77.7551, 12.8631],
  //           [77.7547, 12.8652],
  //         ],
  //       ],
  //     },
  //   },
  //   {
  //     type: "Feature" as const,
  //     properties: { name: "Civic Landmark Belt", type: "landmark_zone" },
  //     geometry: {
  //       type: "Polygon" as const,
  //       coordinates: [
  //         [
  //           [77.7461, 12.8604],
  //           [77.7488, 12.8609],
  //           [77.7493, 12.8588],
  //           [77.7469, 12.8581],
  //           [77.7461, 12.8604],
  //         ],
  //       ],
  //     },
  //   },
  // ],
};

function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return `${hours}h ${remaining}m`;
}

function getAnimatedSegment(
  coordinates: [number, number][] | undefined,
  progress: number,
  windowSize = 30,
) {
  if (!coordinates || coordinates.length === 0) return [];

  if (coordinates.length <= 2) return coordinates;

  const maxIndex = coordinates.length - 1;
  const headIndex = Math.max(1, Math.floor(progress * maxIndex));
  const startIndex = Math.max(0, headIndex - windowSize);

  return coordinates.slice(startIndex, headIndex + 1);
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

const categoryMeta: Record<
  PoiCategory,
  {
    label: string;
    color: string;
    glow: string;
    panelClass: string;
    pinColor: string;
    routeColor: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeBg: string;
    badgeRing: string;
    badgeIcon: string;
  }
> = {
  park: {
    label: "Parks",
    color: "text-emerald-600",
    glow: "bg-emerald-400/20",
    panelClass: "border-emerald-300/70 bg-emerald-50/85",
    pinColor: "text-emerald-600",
    routeColor: "#10b981",
    icon: Trees,
    badgeBg: "bg-emerald-500",
    badgeRing: "ring-emerald-200/80",
    badgeIcon: "text-white",
  },
  mall: {
    label: "Malls",
    color: "text-fuchsia-600",
    glow: "bg-fuchsia-400/20",
    panelClass: "border-fuchsia-300/70 bg-fuchsia-50/85",
    pinColor: "text-fuchsia-600",
    routeColor: "#d946ef",
    icon: ShoppingBag,
    badgeBg: "bg-fuchsia-500",
    badgeRing: "ring-fuchsia-200/80",
    badgeIcon: "text-white",
  },
  bus_stop: {
    label: "Bus Stops",
    color: "text-amber-600",
    glow: "bg-amber-400/20",
    panelClass: "border-amber-300/70 bg-amber-50/85",
    pinColor: "text-amber-600",
    routeColor: "#f59e0b",
    icon: BusFront,
    badgeBg: "bg-amber-500",
    badgeRing: "ring-amber-200/80",
    badgeIcon: "text-white",
  },
  school: {
    label: "Schools",
    color: "text-sky-600",
    glow: "bg-sky-400/20",
    panelClass: "border-sky-300/70 bg-sky-50/85",
    pinColor: "text-sky-600",
    routeColor: "#0ea5e9",
    icon: GraduationCap,
    badgeBg: "bg-sky-500",
    badgeRing: "ring-sky-200/80",
    badgeIcon: "text-white",
  },
  hospital: {
    label: "Hospitals",
    color: "text-rose-600",
    glow: "bg-rose-400/20",
    panelClass: "border-rose-300/70 bg-rose-50/85",
    pinColor: "text-rose-600",
    routeColor: "#f43f5e",
    icon: Hospital,
    badgeBg: "bg-rose-500",
    badgeRing: "ring-rose-200/80",
    badgeIcon: "text-white",
  },
  landmark: {
    label: "Landmarks",
    color: "text-violet-600",
    glow: "bg-violet-400/20",
    panelClass: "border-violet-300/70 bg-violet-50/85",
    pinColor: "text-violet-600",
    routeColor: "#8b5cf6",
    icon: Landmark,
    badgeBg: "bg-violet-500",
    badgeRing: "ring-violet-200/80",
    badgeIcon: "text-white",
  },
  "IT Company": {
    label: "IT Company",
    color: "text-emerald-700",
    glow: "bg-emerald-500/20",
    panelClass: "border-emerald-300/70 bg-emerald-50/85",
    pinColor: "text-emerald-700",
    routeColor: "#059669",
    icon: Building2,
    badgeBg: "bg-teal-600",
    badgeRing: "ring-teal-200/80",
    badgeIcon: "text-white",
  },
};

type MapOverlayLayerProps = {
  showParks: boolean;
  showCommercial: boolean;
  onHoverNameChange: (name: string | null) => void;
};

function MapOverlayLayers({
  showParks,
  showCommercial,
  onHoverNameChange,
}: MapOverlayLayerProps) {
  const { map, isLoaded } = useMap();

  const ensureLayers = useCallback(() => {
    if (!map) return;

    if (!map.getSource("area-intelligence")) {
      map.addSource("area-intelligence", {
        type: "geojson",
        data: geojsonData,
      });
    }

    if (!map.getLayer("parks-fill")) {
      map.addLayer({
        id: "parks-fill",
        type: "fill",
        source: "area-intelligence",
        filter: ["==", ["get", "type"], "park"],
        paint: {
          "fill-color": "#4ade80",
          "fill-opacity": 0.24,
        },
      });
    }

    if (!map.getLayer("parks-outline")) {
      map.addLayer({
        id: "parks-outline",
        type: "line",
        source: "area-intelligence",
        filter: ["==", ["get", "type"], "park"],
        paint: {
          "line-color": "#16a34a",
          "line-width": 2,
          "line-opacity": 0.9,
        },
      });
    }

    if (!map.getLayer("commercial-fill")) {
      map.addLayer({
        id: "commercial-fill",
        type: "fill",
        source: "area-intelligence",
        filter: [
          "any",
          ["==", ["get", "type"], "commercial"],
          ["==", ["get", "type"], "landmark_zone"],
        ],
        paint: {
          "fill-color": [
            "match",
            ["get", "type"],
            "commercial",
            "#c084fc",
            "landmark_zone",
            "#60a5fa",
            "#cbd5e1",
          ],
          "fill-opacity": 0.14,
        },
      });
    }

    if (!map.getLayer("commercial-outline")) {
      map.addLayer({
        id: "commercial-outline",
        type: "line",
        source: "area-intelligence",
        filter: [
          "any",
          ["==", ["get", "type"], "commercial"],
          ["==", ["get", "type"], "landmark_zone"],
        ],
        paint: {
          "line-color": [
            "match",
            ["get", "type"],
            "commercial",
            "#a855f7",
            "landmark_zone",
            "#2563eb",
            "#64748b",
          ],
          "line-width": 2,
          "line-opacity": 0.9,
        },
      });
    }
  }, [map]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    ensureLayers();

    const interactiveLayers = ["parks-fill", "commercial-fill"];

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      onHoverNameChange(null);
    };

    const handleMouseMove = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: interactiveLayers.filter((id) => !!map.getLayer(id)),
      });

      if (features.length > 0) {
        onHoverNameChange(features[0]?.properties?.name ?? null);
      } else {
        onHoverNameChange(null);
      }
    };

    interactiveLayers.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.on("mouseenter", layerId, handleMouseEnter);
        map.on("mouseleave", layerId, handleMouseLeave);
        map.on("mousemove", layerId, handleMouseMove);
      }
    });

    return () => {
      interactiveLayers.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.off("mouseenter", layerId, handleMouseEnter);
          map.off("mouseleave", layerId, handleMouseLeave);
          map.off("mousemove", layerId, handleMouseMove);
        }
      });
    };
  }, [map, isLoaded, ensureLayers, onHoverNameChange]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (map.getLayer("parks-fill")) {
      map.setLayoutProperty(
        "parks-fill",
        "visibility",
        showParks ? "visible" : "none",
      );
    }
    if (map.getLayer("parks-outline")) {
      map.setLayoutProperty(
        "parks-outline",
        "visibility",
        showParks ? "visible" : "none",
      );
    }

    if (map.getLayer("commercial-fill")) {
      map.setLayoutProperty(
        "commercial-fill",
        "visibility",
        showCommercial ? "visible" : "none",
      );
    }
    if (map.getLayer("commercial-outline")) {
      map.setLayoutProperty(
        "commercial-outline",
        "visibility",
        showCommercial ? "visible" : "none",
      );
    }
  }, [map, isLoaded, showParks, showCommercial]);

  return null;
}

function CategoryBadge({
  category,
  selected = false,
  size = "md",
}: {
  category: PoiCategory;
  selected?: boolean;
  size?: "sm" | "md";
}) {
  const meta = categoryMeta[category];
  const Icon = meta.icon;

  const sizeClass = size === "sm" ? "h-9 w-9" : "h-11 w-11";

  const iconSizeClass = size === "sm" ? "size-4" : "size-5";

  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`absolute inset-0 rounded-full blur-md transition-all duration-300 ${meta.glow} ${
          selected ? "scale-125 opacity-80" : "opacity-40"
        }`}
      />
      <div
        className={`relative flex items-center justify-center rounded-full shadow-2xl  transition-all duration-300 ${sizeClass} ${meta.badgeBg} ${
          selected ? "scale-100" : "group-hover:scale-100"
        }`}
      >
        <Icon
          className={`${iconSizeClass} ${meta.badgeIcon}`}
          // strokeWidth={2.2}
        />
      </div>
    </div>
  );
}

function PoiMarker({
  poi,
  isSelected,
  onMarkerClick,
  onViewRoute,
}: {
  poi: Poi;
  isSelected: boolean;
  onMarkerClick: () => void;
  onViewRoute: () => void;
}) {
  const meta = categoryMeta[poi.category];

  return (
    <MapMarker longitude={poi.lng} latitude={poi.lat}>
      <MarkerContent>
        <button
          type="button"
          onClick={onMarkerClick}
          className="group relative"
        >
          <CategoryBadge
            category={poi.category}
            selected={isSelected}
            size="md"
          />
        </button>
      </MarkerContent>

      <MarkerTooltip>{poi.name}</MarkerTooltip>

      <MarkerPopup className="bg-transparent shadow-none border-none">
        <div className="w-70 overflow-hidden rounded-2xl border border-slate-200 bg-white  shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
          {poi.image ? (
            <div className="h-36 w-full overflow-hidden bg-slate-100">
              <img
                src={poi.image}
                alt={poi.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-36 w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
              No image
            </div>
          )}

          <div className="space-y-3 p-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                {meta.label}
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">
                {poi.name}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {poi.rating && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                  ★ {poi.rating.toFixed(1)}
                </span>
              )}

              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1">
                {poi.distanceLabel}
              </span>

              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1">
                {poi.timeLabel}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onViewRoute}
                className="flex-1 rounded-xl cursor-pointer bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                View Route
              </button>

              <button
                type="button"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}`,
                    "_blank",
                  )
                }
                className="rounded-xl cursor-pointer border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open
              </button>
            </div>
          </div>
        </div>
      </MarkerPopup>
    </MapMarker>
  );
}

function MapClickClearRoute({
  onClear,
  suppressRef,
}: {
  onClear: () => void;
  suppressRef: React.MutableRefObject<boolean>;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleMapClick = () => {
      if (suppressRef.current) {
        suppressRef.current = false;
        return;
      }

      onClear();
    };

    map.on("click", handleMapClick);

    return () => {
      map.off("click", handleMapClick);
    };
  }, [map, isLoaded, onClear, suppressRef]);

  return null;
}


export function CustomStyleExample() {
  const mapRef = useRef<MapRef>(null);
  const suppressNextMapClearRef = useRef(false);

  const [style, setStyle] = useState<StyleKey>("default");
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPoiId, setSelectedPoiId] = useState<number | null>(null);
  const [routeProgress, setRouteProgress] = useState(0);
  const [routePoiId, setRoutePoiId] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState<PoiCategory[]>([
    "park",
    "mall",
    "bus_stop",
    "school",
    "hospital",
    "landmark",
    "IT Company",
  ]);

  const [search, setSearch] = useState("");
  const [showParkZones, setShowParkZones] = useState(true);
  const [showCommercialZones, setShowCommercialZones] = useState(true);
  const [hoveredLayerName, setHoveredLayerName] = useState<string | null>(null);

  const selectedStyle = styles[style];
  const is3D = style === "openstreetmap3d";

  useEffect(() => {
    mapRef.current?.easeTo?.({
      pitch: is3D ? 55 : 0,
      duration: 500,
    });
  }, [is3D]);
useEffect(() => {
  let cancelled = false;

  const CACHE_KEY = "veranza-poi-routes-v1";
  const MAX_CONCURRENT = 2; // keep low to respect rate limits
  const REQUEST_SPACING = 220; // throttle between request starts
  const REQUEST_TIMEOUT = 12000;

  function getRouteCacheKey(poi: Poi) {
    return `${centerPlace.lng},${centerPlace.lat}:${poi.lng},${poi.lat}`;
  }

  function loadCache(): Record<string, RouteData> {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as Record<string, RouteData>;
    } catch {
      return {};
    }
  }

  function saveCache(cache: Record<string, RouteData>) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // ignore storage failures
    }
  }

  async function fetchRouteForPoi(poi: Poi): Promise<RouteData | null> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${centerPlace.lng},${centerPlace.lat};${poi.lng},${poi.lat}?overview=full&geometries=geojson`,
        {
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        console.warn("Route fetch failed:", poi.name, response.status);
        return null;
      }

      const data = await response.json();
      const route = data?.routes?.[0];

      if (!route?.geometry?.coordinates) {
        console.warn("Invalid route:", poi.name);
        return null;
      }

      return {
        id: poi.id,
        name: poi.name,
        coordinates: route.geometry.coordinates as [number, number][],
        duration: route.duration as number,
        distance: route.distance as number,
      };
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        console.warn("Route fetch error:", poi.name, err);
      }
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function runQueue() {
    setIsLoading(true);

    const cache = loadCache();
    const cachedResults: RouteData[] = [];
    const uncachedPois: Poi[] = [];

    for (const poi of pois) {
      const cacheKey = getRouteCacheKey(poi);
      const cached = cache[cacheKey];
      if (cached) {
        cachedResults.push(cached);
      } else {
        uncachedPois.push(poi);
      }
    }

    if (!cancelled) {
      setRoutes(cachedResults);
    }

    if (uncachedPois.length === 0) {
      if (!cancelled) setIsLoading(false);
      return;
    }

    let nextIndex = 0;
    let activeCount = 0;
    let startedCount = 0;

    await new Promise<void>((resolve) => {
      const launchNext = () => {
        if (cancelled) {
          resolve();
          return;
        }

        if (nextIndex >= uncachedPois.length && activeCount === 0) {
          resolve();
          return;
        }

        while (activeCount < MAX_CONCURRENT && nextIndex < uncachedPois.length) {
          const poi = uncachedPois[nextIndex++];
          const startDelay = startedCount * REQUEST_SPACING;
          startedCount += 1;
          activeCount += 1;

          window.setTimeout(async () => {
            const result = await fetchRouteForPoi(poi);

            if (result && !cancelled) {
              const cacheKey = getRouteCacheKey(poi);
              cache[cacheKey] = result;
              saveCache(cache);

              setRoutes((prev) => {
                const exists = prev.some((item) => item.id === result.id);
                if (exists) return prev;
                return [...prev, result];
              });
            }

            activeCount -= 1;
            launchNext();
          }, startDelay);
        }
      };

      launchNext();
    });

    if (!cancelled) {
      setIsLoading(false);
    }
  }

  runQueue();

  return () => {
    cancelled = true;
  };
}, []);

  const filteredPois = useMemo(() => {
    const q = search.trim().toLowerCase();

    return pois.filter((poi) => {
      const matchesCategory = selectedCategories.includes(poi.category);
      const matchesSearch =
        !q ||
        poi.name.toLowerCase().includes(q) ||
        categoryMeta[poi.category].label.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategories, search]);

  const featuredPois = useMemo(() => {
    return filteredPois.filter((poi) => poi.featured);
  }, [filteredPois]);

  const stats = useMemo(() => {
    return {
      totalPois: filteredPois.length,
      activeCategories: selectedCategories.length,
      routes: routes.length,
    };
  }, [filteredPois.length, selectedCategories.length, routes.length]);

  function toggleCategory(category: PoiCategory) {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category],
    );
  }

  function flyToCoordinates(lng: number, lat: number, zoom = 13.8) {
    mapRef.current?.flyTo?.({
      center: [lng, lat],
      zoom,
      duration: 1200,
    });
  }
  function handlePoiMarkerClick(poi: Poi) {
    suppressNextMapClearRef.current = true;
    setSelectedPoiId(poi.id);

    mapRef.current?.flyTo?.({
      center: [poi.lng, poi.lat],
      zoom: 16.8,
      duration: 1200,
    });
  }

  function resetFilters() {
    setSelectedPoiId(null);
    setRoutePoiId(null);
    setRouteProgress(0);
    setSearch("");
    setSelectedCategories([
      "park",
      "mall",
      "bus_stop",
      "school",
      "hospital",
      "landmark",
      "IT Company",
    ]);
    setShowParkZones(true);
    setShowCommercialZones(true);

    mapRef.current?.flyTo?.({
      center: [centerPlace.lng, centerPlace.lat],
      zoom: 15,
      duration: 1200,
    });
  }

  const clearActiveRoute = useCallback(() => {
    setRoutePoiId(null);
    setRouteProgress(0);
    setSelectedPoiId(null);
  }, []);

  function handleViewRoute(poi: Poi) {
    suppressNextMapClearRef.current = true;
    setSelectedPoiId(poi.id);
    setRoutePoiId(poi.id);
    setRouteProgress(0);

    mapRef.current?.flyTo?.({
      center: [poi.lng, poi.lat],
      zoom: 13.8,
      duration: 1200,
    });
  }

  
  const selectedPoi =
    filteredPois.find((poi) => poi.id === selectedPoiId) ??
    pois.find((poi) => poi.id === selectedPoiId) ??
    null;

  const activeRoute = routes.find((route) => route.id === routePoiId) ?? null;

  useEffect(() => {
  if (!activeRoute) {
    setRouteProgress(0);
    return;
  }

  let frameId = 0;
  let start: number | null = null;
  const duration = 2600;

  const animate = (time: number) => {
    if (start === null) start = time;

    const elapsed = time - start;
    const progress = (elapsed % duration) / duration;

    setRouteProgress(progress);
    frameId = requestAnimationFrame(animate);
  };

  frameId = requestAnimationFrame(animate);

  return () => cancelAnimationFrame(frameId);
}, [activeRoute]);

const animatedCoordinates = useMemo(() => {
  if (!activeRoute) return [];

  if (!Array.isArray(activeRoute.coordinates)) return [];

  if (activeRoute.coordinates.length < 2) return [];

  return getAnimatedSegment(activeRoute.coordinates, routeProgress, 30);
}, [activeRoute, routeProgress]);

  const activeRouteColor = selectedPoi
    ? categoryMeta[selectedPoi.category].routeColor
    : "#22d3ee";

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-100">
      <Map
        ref={mapRef}
        center={[centerPlace.lng, centerPlace.lat]}
        zoom={15}
        styles={
          selectedStyle
            ? { light: selectedStyle, dark: selectedStyle }
            : undefined
        }
      >
        <MapControls />

        <MapClickClearRoute
          onClear={clearActiveRoute}
          suppressRef={suppressNextMapClearRef}
        />

        <MapOverlayLayers
          showParks={showParkZones}
          showCommercial={showCommercialZones}
          onHoverNameChange={setHoveredLayerName}
        />
        {activeRoute && (
          <>
            <MapRoute
              coordinates={activeRoute.coordinates}
              color="#ffffff"
              width={3}
              opacity={0.55}
            />

            <MapRoute
              coordinates={activeRoute.coordinates}
              color={activeRouteColor}
              width={6}
              opacity={0.16}
            />
          </>
        )}

        {animatedCoordinates.length > 1 && (
          <MapRoute
            coordinates={animatedCoordinates}
            color={activeRouteColor}
            width={5}
            opacity={1}
          />
        )}

        <MapMarker longitude={centerPlace.lng} latitude={centerPlace.lat}>
          <MarkerContent>
            <div className="relative flex items-center justify-center">
              {/* <div className="absolute size-12 animate-ping rounded-full bg-cyan-400/20" /> */}
              {/* <div className="absolute size-8 rounded-full bg-cyan-400/15 blur-md" /> */}
              {/* <FaMapMarkerAlt className="size-8 text-red-600 opacity-90 drop-shadow-[0_8px_16px_rgba(34,211,238,0.22)]" /> */}
              <img src="/VeranzaFavicon.svg" alt="Veranza Logo" />
            </div>
          </MarkerContent>

          <MarkerTooltip>{centerPlace.name}</MarkerTooltip>

          <MarkerPopup>
            <div className="space-y-1">
              <p className="font-medium text-slate-900">{centerPlace.name}</p>
              <p className="text-xs text-slate-600">
                {centerPlace.lat.toFixed(6)}, {centerPlace.lng.toFixed(6)}
              </p>
            </div>
          </MarkerPopup>
        </MapMarker>

        {filteredPois.map((poi) => (
          <PoiMarker
            key={poi.id}
            poi={poi}
            isSelected={selectedPoiId === poi.id}
            onMarkerClick={() => handlePoiMarkerClick(poi)}
            onViewRoute={() => handleViewRoute(poi)}
          />
        ))}
      </Map>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_30%),linear-gradient(to_bottom,rgba(255,255,255,0.02),rgba(255,255,255,0.06))]" />

      <>
        {/* Mobile / Tablet open button */}
        <div className="absolute bottom-4 right-4 z-30 md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.18)] backdrop-blur-xl transition hover:bg-white"
          >
            <Layers className="size-4" />
            Filters
          </button>
        </div>

        {/* Desktop / Tablet side panel */}
        <div
          className={`absolute right-4 top-4 z-20 hidden h-[calc(100%-2rem)] max-w-[calc(100vw-2rem)] transition-all duration-500 md:block ${
            isFilterOpen
              ? "w-85 lg:w-92.5 translate-x-0"
              : "w-85 lg:w-92.5 translate-x-[calc(100%+10px)]"
          }`}
        >
          <div className="relative h-full">
            {/* Left bulge handle */}
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`absolute left-0 top-1/2 z-30 flex h-auto py-5  w-auto pl-3 pr-2 cursor-pointer -translate-x-[100%] 
              -translate-y-1/2 items-center justify-center rounded-l-full border ${isFilterOpen ? "border-white/70 bg-white/80 text-slate-700 hover:bg-black hover:shadow-2xl hover:text-slate-100" : "border-white/70 bg-neutral-900 text-slate-100 "}  backdrop-blur-xl transition hover:scale-105 `}
              aria-label={isFilterOpen ? "Close filters" : "Open filters"}
            >
              <div className="flex flex-row gap-3 items-center gap-1">
                {/* <Layers className="size-4" /> */}
                <MdKeyboardArrowLeft className="text-2xl" />
              </div>
            </button>

            <div className="flex h-full flex-col overflow-hidden rounded-[30px] border border-white/60 bg-white/72 text-slate-900 shadow-[0_10px_34px_rgba(15,23,42,0.14)] backdrop-blur-2xl">
              <div className="border-b border-slate-200/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                      Nearby Filters
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">
                      Famous Places
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white/80 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="relative mt-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search places, companies, schools..."
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white/85 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-cyan-300"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="border-b border-slate-200/80 p-4">
                <p className="mb-3 text-sm font-medium text-slate-800">
                  Categories
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(categoryMeta) as PoiCategory[]).map(
                    (category) => {
                      const meta = categoryMeta[category];
                      const active = selectedCategories.includes(category);

                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left transition-all ${
                            active
                              ? `${meta.panelClass} shadow-sm`
                              : "border-slate-200 bg-white/70 hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              active
                                ? meta.color.replace("text-", "bg-")
                                : "bg-slate-300"
                            }`}
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {meta.label}
                            </p>
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="border-b border-slate-200/80 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Layers className="size-4 text-slate-700" />
                  <p className="text-sm font-medium text-slate-800">
                    GeoJSON Layers
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowParkZones((prev) => !prev)}
                    className={`flex items-center justify-between rounded-2xl border px-3 py-3 transition ${
                      showParkZones
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white/70 p-2">
                        <Trees className="size-4 text-emerald-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-900">
                          Park Zones
                        </p>
                        <p className="text-xs text-slate-500">
                          Custom mapped green areas
                        </p>
                      </div>
                    </div>
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        showParkZones ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCommercialZones((prev) => !prev)}
                    className={`flex items-center justify-between rounded-2xl border px-3 py-3 transition ${
                      showCommercialZones
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200 bg-white/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white/70 p-2">
                        <Building2 className="size-4 text-violet-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-900">
                          Commercial / Landmark Zones
                        </p>
                        <p className="text-xs text-slate-500">
                          Retail and civic highlighted zones
                        </p>
                      </div>
                    </div>
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        showCommercialZones ? "bg-violet-500" : "bg-slate-300"
                      }`}
                    />
                  </button>
                </div>

                {hoveredLayerName && (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700">
                    Hovered layer:{" "}
                    <span className="font-semibold text-slate-900">
                      {hoveredLayerName}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-hidden p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">
                    Featured & Nearby
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      mapRef.current?.flyTo?.({
                        center: [centerPlace.lng, centerPlace.lat],
                        zoom: 15,
                        duration: 1200,
                      })
                    }
                    className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50"
                  >
                    Recenter
                  </button>
                </div>

                <div className="h-full space-y-2 overflow-y-auto pr-1">
                  {(featuredPois.length ? featuredPois : filteredPois).map(
                    (poi) => {
                      const meta = categoryMeta[poi.category];
                      const isSelected = selectedPoi?.id === poi.id;
                      const linkedRoute = routes.find(
                        (route) => route.id === poi.id,
                      );

                      return (
                        <button
                          key={poi.id}
                          type="button"
                          onClick={() => handlePoiMarkerClick(poi)}
                          className={`w-full rounded-3xl border p-4 text-left transition-all ${
                            isSelected
                              ? "border-cyan-300 bg-cyan-50 shadow-sm"
                              : "border-slate-200 bg-white/75 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <CategoryBadge
                                category={poi.category}
                                selected={isSelected}
                                size="sm"
                              />

                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {poi.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {meta.label}
                                </p>
                              </div>
                            </div>

                            {poi.featured && (
                              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[10px] uppercase tracking-wide text-cyan-700">
                                Popular
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span className="rounded-full bg-slate-100 px-2 py-1">
                              {linkedRoute
                                ? formatDistance(linkedRoute.distance)
                                : poi.distanceLabel}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1">
                              {linkedRoute
                                ? formatDuration(linkedRoute.duration)
                                : poi.timeLabel}
                            </span>
                            {poi.rating && (
                              <span className="rounded-full bg-slate-100 px-2 py-1">
                                {poi.rating.toFixed(1)} ★
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    },
                  )}

                  {!filteredPois.length && (
                    <div className="rounded-3xl border border-slate-200 bg-white/75 p-6 text-center text-sm text-slate-500">
                      No places match your current filters.
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200/80 p-4">
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      mapRef.current?.flyTo?.({
                        center: [centerPlace.lng, centerPlace.lat],
                        zoom: 15,
                        duration: 1200,
                      })
                    }
                    className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800 transition hover:bg-slate-50"
                  >
                    <MapPinned className="size-4" />
                    Project
                  </button>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800 transition hover:bg-slate-50"
                  >
                    <X className="size-4" />
                    Reset
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Map Style
                  </p>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as StyleKey)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                  >
                    <option value="default">Default (Carto)</option>
                    <option value="openstreetmap">OpenStreetMap</option>
                    <option value="openstreetmap3d">OpenStreetMap 3D</option>
                  </select>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Route Mode
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Click any POI to show an animated route from the project
                    center.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile bottom sheet */}
        <div
          className={`absolute inset-x-0 bottom-0 z-40 rounded-t-[30px] border border-white/60 bg-white/92 shadow-[0_-16px_40px_rgba(15,23,42,0.2)] backdrop-blur-2xl transition-transform duration-500 md:hidden ${
            isMobileFiltersOpen
              ? "translate-y-0"
              : "translate-y-[calc(100%-68px)]"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
            <div className="mx-auto h-1.5 w-14 rounded-full bg-slate-300" />
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(false)}
              className="absolute right-4 rounded-xl border border-slate-200 bg-white/80 p-2 text-slate-500"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="max-h-[78vh] overflow-y-auto p-4">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                Nearby Filters
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">
                Famous Places
              </h3>

              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search places, companies, schools..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white/85 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-cyan-300"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mb-4">
              <p className="mb-3 text-sm font-medium text-slate-800">
                Categories
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(categoryMeta) as PoiCategory[]).map(
                  (category) => {
                    const meta = categoryMeta[category];
                    const active = selectedCategories.includes(category);

                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left transition-all ${
                          active
                            ? `${meta.panelClass} shadow-sm`
                            : "border-slate-200 bg-white/70 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            active
                              ? meta.color.replace("text-", "bg-")
                              : "bg-slate-300"
                          }`}
                        />
                        <p className="text-sm font-medium text-slate-900">
                          {meta.label}
                        </p>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="mb-4 grid gap-2">
              <button
                type="button"
                onClick={() => setShowParkZones((prev) => !prev)}
                className={`flex items-center justify-between rounded-2xl border px-3 py-3 transition ${
                  showParkZones
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Trees className="size-4 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-900">
                    Park Zones
                  </span>
                </div>
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    showParkZones ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setShowCommercialZones((prev) => !prev)}
                className={`flex items-center justify-between rounded-2xl border px-3 py-3 transition ${
                  showCommercialZones
                    ? "border-violet-300 bg-violet-50"
                    : "border-slate-200 bg-white/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="size-4 text-violet-600" />
                  <span className="text-sm font-medium text-slate-900">
                    Commercial / Landmark Zones
                  </span>
                </div>
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    showCommercialZones ? "bg-violet-500" : "bg-slate-300"
                  }`}
                />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  mapRef.current?.flyTo?.({
                    center: [centerPlace.lng, centerPlace.lat],
                    zoom: 15,
                    duration: 1200,
                  })
                }
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800"
              >
                <MapPinned className="size-4" />
                Project
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800"
              >
                <X className="size-4" />
                Reset
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Map Style
              </p>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as StyleKey)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              >
                <option value="default">Default (Carto)</option>
                <option value="openstreetmap">OpenStreetMap</option>
                <option value="openstreetmap3d">OpenStreetMap 3D</option>
              </select>
            </div>
          </div>
        </div>
      </>

      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/20 backdrop-blur-sm">
          <div className="rounded-3xl border border-white/70 bg-white/85 px-5 py-4 text-slate-900 shadow-xl backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-cyan-600" />
              <span className="text-sm text-slate-700">
                Loading Trifecta Veranza Map...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
