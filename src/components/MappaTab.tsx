import React, { useEffect, useRef, useState } from "react";
import { useAppSelector } from "../store";
import { Shop } from "../types";
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, InfoWindow, useMap } from "@vis.gl/react-google-maps";

export const SHOPS: Shop[] = [
  {id:'shop1', name:'Panificio Antico del Corso', address:'Corso della Repubblica, 42, Macerata', lat:43.3005, lng:13.4540, type:'Forno Storico', qr_secret:'CORSO-001', hours:'07:00-13:00, 16:00-20:00'},
  {id:'shop2', name:'Drogheria di Piazza', address:'Piazza della Libertà, 10, Macerata', lat:43.2995, lng:13.4530, type:'Drogheria Artigianale', qr_secret:'PIAZZA-002', hours:'08:00-13:00, 16:30-19:30'},
  {id:'shop3', name:'Erboristeria dei Sibillini', address:'Via Gramsci, 8, Macerata', lat:43.3012, lng:13.4550, type:'Erbe Aromatiche e Spezie', qr_secret:'SIBIL-003', hours:'08:30-13:00, 16:00-20:00'},
  {id:'shop4', name:'Alimentari Da Beppe', address:'Via Garibaldi, 17, Macerata', lat:43.2985, lng:13.4520, type:'Salumeria e Formaggeria', qr_secret:'BEPPE-004', hours:'08:00-13:00, 16:00-19:40'},
  {id:'shop5', name:'Norcineria Centofanti', address:'Piaggia dell\'Università, Macerata', lat:43.3018, lng:13.4515, type:'Norcineria Marchigiana', qr_secret:'CENTO-005', hours:'08:00-13:00, 16:00-20:00'}
];

// Partner Restaurants to be displayed on the map
export const EX_RESTAURANTS = [
  { id: "rest1", name: "Osteria San Nicola", address: "Via San Nicola, 13, Tolentino (MC)", specialty: "Vincisgrassi tradizionali, coniglio in porchetta, ciavuscolo", lat: 43.2085, lng: 13.2847, hours: "12:30-14:30, 19:30-22:30" },
  { id: "rest2", name: "Le Sette Cuccagne", address: "Viale Foro Boario, 2, Caldarola (MC)", specialty: "Gnocchi con sugo di papera", lat: 43.1385, lng: 13.2268, hours: "Ven-Dom: 12:00-15:00, 19:00-23:00" },
  { id: "rest3", name: "Osteria del Silenzio", address: "Via del Borgo, 15, Ripe San Ginesio (MC)", specialty: "Tagliolini rari al tartufo", lat: 43.1432, lng: 13.3674, hours: "Lun-Sab: 19:00-23:30" },
  { id: "rest4", name: "Trattoria Da Ezio", address: "Via Giuseppe Mazzini, 4, Macerata (MC)", specialty: "Vincisgrassi storici STG", lat: 43.3002, lng: 13.4534, hours: "12:30-14:30, 19:30-22:30 (Chiuso Lun)" },
  { id: "rest5", name: "Osteria da Vittorio", address: "Corso Garibaldi, 45, Tolentino (MC)", specialty: "Tagliata marchigiana al sale", lat: 43.2108, lng: 13.2885, hours: "12:00-14:30, 19:30-22:30 (Chiuso Mar)" }
];

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY.trim() !== "" && API_KEY !== "YOUR_API_KEY";

interface MappaTabProps {
  focusedShopId: string | null;
  onClearFocus: () => void;
  showToastMsg: (msg: string, type: "success" | "error" | "info") => void;
}

// Controller component to manage Google Maps pan and zoom state
function MapController({
  focusedShopId,
  selectedEntity,
  setSelectedEntity,
}: {
  focusedShopId: string | null;
  selectedEntity: any;
  setSelectedEntity: (entity: any) => void;
}) {
  const map = useMap();
  const { stamps } = useAppSelector((state) => state.user);
  const { shoppingCart } = useAppSelector((state) => state.recipe);
  const neededShopIds = shoppingCart.map((item) => item.shopId);

  useEffect(() => {
    if (!map) return;
    if (focusedShopId) {
      const targetShop = SHOPS.find((s) => s.id === focusedShopId);
      const targetRest = EX_RESTAURANTS.find((r) => r.id === focusedShopId);
      if (targetShop) {
        map.setCenter({ lat: targetShop.lat, lng: targetShop.lng });
        map.setZoom(17);
        setSelectedEntity({ ...targetShop, isRestaurant: false });
      } else if (targetRest) {
        map.setCenter({ lat: targetRest.lat, lng: targetRest.lng });
        map.setZoom(17);
        setSelectedEntity({ ...targetRest, isRestaurant: true });
      }
    }
  }, [map, focusedShopId]);

  return (
    <>
      {SHOPS.map((shop) => {
        const done = stamps.includes(shop.id);
        const isNeeded = neededShopIds.includes(shop.id);
        const color = done ? "#10b981" : isNeeded ? "#f97316" : "#475569";
        const glyphText = done ? "✓" : isNeeded ? "🛒" : "📍";
        const glyphColor = isNeeded && !done ? "#0f172a" : "#ffffff";

        return (
          <AdvancedMarker
            key={shop.id}
            position={{ lat: shop.lat, lng: shop.lng }}
            title={shop.name}
            onClick={() => setSelectedEntity({ ...shop, isRestaurant: false })}
          >
            <Pin background={color} glyphColor={glyphColor} glyph={glyphText} />
          </AdvancedMarker>
        );
      })}

      {EX_RESTAURANTS.map((rest) => (
        <AdvancedMarker
          key={rest.id}
          position={{ lat: rest.lat, lng: rest.lng }}
          title={rest.name}
          onClick={() => setSelectedEntity({ ...rest, isRestaurant: true })}
        >
          <Pin background="#fbbf24" glyphColor="#1e1b4b" glyph="🍽️" />
        </AdvancedMarker>
      ))}

      {selectedEntity && (
        <InfoWindow
          position={{ lat: selectedEntity.lat, lng: selectedEntity.lng }}
          onCloseClick={() => setSelectedEntity(null)}
        >
          <div className="font-sans p-1 text-slate-900 max-w-[200px]">
            <h4 className="font-black text-[13.5px] leading-tight text-slate-950 mb-1">
              {selectedEntity.isRestaurant ? "👑 " : ""}{selectedEntity.name}
            </h4>
            <p className="text-[10.5px] font-bold text-orange-600 uppercase tracking-wider mb-1">
              {selectedEntity.isRestaurant ? "Ristorante Partner Verificato" : selectedEntity.type}
            </p>
            {selectedEntity.specialty && (
              <p className="text-[11px] text-slate-700 leading-snug mb-1">
                ✨ {selectedEntity.specialty}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mb-1.5">
              📍 {selectedEntity.address}
            </p>
            {!selectedEntity.isRestaurant ? (
              <div className="border-t border-dashed border-slate-200 pt-1.5 mt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CODICE QR REALE: </span>
                <code className="text-[11px] font-bold text-orange-600 bg-orange-50 px-1 rounded font-mono">{selectedEntity.qr_secret}</code>
              </div>
            ) : (
              <p className="text-[10.5px] text-slate-500 font-mono">🕒 {selectedEntity.hours}</p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function MappaTab({ focusedShopId, onClearFocus, showToastMsg }: MappaTabProps) {
  const mapRef = useRef<any>(null);
  const mapContainerId = "leaflet-map-pwa";

  const { stamps } = useAppSelector((state) => state.user);
  const { shoppingCart } = useAppSelector((state) => state.recipe);

  const neededShopIds = shoppingCart.map((item) => item.shopId);
  const [mapMode, setMapMode] = useState<"standard" | "google">(hasValidKey ? "google" : "standard");
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (mapMode !== "standard") return;

    if (!(window as any).L) {
      console.warn("Leaflet library not found on window context.");
      return;
    }

    const L = (window as any).L;

    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (err) {
        console.warn("Notice clearing leaflet map container:", err);
      }
      mapRef.current = null;
    }

    const mapInstance = L.map(mapContainerId, {
      zoomControl: false,
      attributionControl: true,
    }).setView([43.2200, 13.3500], 11);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: "La Ricetta Autentica © CARTO",
    }).addTo(mapInstance);

    mapRef.current = mapInstance;

    SHOPS.forEach((shop) => {
      const done = stamps.includes(shop.id);
      const isNeeded = neededShopIds.includes(shop.id);
      const color = done ? "#10b981" : isNeeded ? "#f97316" : "#475569";
      const iconText = done ? "✓" : isNeeded ? "🛒" : "📍";
      const dotColor = isNeeded && !done ? "#0f172a" : "#ffffff";

      const customIcon = L.divIcon({
        html: `<div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${dotColor}; font-size: 14px; border: 2.5px solid #0f172a; box-shadow: 0 4px 12px rgba(0,0,0,0.4); font-weight: 900;">${iconText}</div>`,
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker([shop.lat, shop.lng], { icon: customIcon })
        .addTo(mapInstance)
        .bindPopup(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; width: 190px; color: #f1f5f9; background: #0f172a; border-radius: 12px; padding: 4px;">
            <b style="color: #ffffff; font-size: 13.5px; font-weight: 800; display: block; margin-bottom: 2px;">${shop.name}</b>
            <span style="color: #f97316; font-size: 10.5px; font-weight: 750; display: block; margin-bottom: 4px;">${shop.type}</span>
            <span style="color: #94a3b8; font-size: 11px; display: block; margin-bottom: 6px;">📍 ${shop.address}</span>
            <div style="border-top: 1px dashed rgba(249, 115, 22, 0.2); padding-top: 5px; margin-top: 4px;">
              <span style="color: #cbd5e1; font-weight: 700; font-size: 10.5px;">CODICE QR REALE: </span>
              <code style="font-size:11.5px; font-weight: 800; color: #f97316; font-family: 'JetBrains Mono', monospace; display: inline-block; padding: 1px 4px; background: rgba(249, 115, 22, 0.08); border-radius: 4px;">${shop.qr_secret}</code>
            </div>
          </div>
        `);
    });

    EX_RESTAURANTS.forEach((rest) => {
      const color = "#fbbf24";
      const iconText = "🍽️";

      const rIcon = L.divIcon({
        html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #1e1b4b; font-size: 15px; border: 3px solid #ff7800; box-shadow: 0 4px 15px rgba(251, 191, 36, 0.5); font-weight: 900;">${iconText}</div>`,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker([rest.lat, rest.lng], { icon: rIcon })
        .addTo(mapInstance)
        .bindPopup(`
          <div style="font-family: 'Plus Jakarta Sans', sans-serif; width: 190px; color: #f1f5f9; background: #0f172a; border-radius: 12px; padding: 4px;">
            <b style="color: #ffffff; font-size: 13.5px; font-weight: 800; display: block; margin-bottom: 2px;">👑 ${rest.name}</b>
            <span style="color: #fbbf24; font-size: 10.5px; font-weight: 750; display: block; margin-bottom: 4px;">Ristorante Partner Verificato</span>
            <span style="color: #ff9800; font-size: 10.5px; display: block; margin-bottom: 4px;">🇮🇹 Spec: ${rest.specialty}</span>
            <span style="color: #94a3b8; font-size: 11px; display: block; margin-bottom: 6px;">📍 ${rest.address}</span>
            <span style="color: #cbd5e1; font-size: 10.5px; display: block; font-family: 'JetBrains Mono', monospace;">Ora: ${rest.hours}</span>
          </div>
        `);
    });

    if (focusedShopId) {
      const targetShop = SHOPS.find((s) => s.id === focusedShopId);
      const targetRest = EX_RESTAURANTS.find((r) => r.id === focusedShopId);

      if (targetShop) {
        mapInstance.setView([targetShop.lat, targetShop.lng], 17, { animate: true });
        showToastMsg(`Mappa centrata su: ${targetShop.name}! 📍`, "info");
      } else if (targetRest) {
        mapInstance.setView([targetRest.lat, targetRest.lng], 17, { animate: true });
        showToastMsg(`Mappa centrata su: ${targetRest.name}! 🍽️`, "info");
      }
    }

    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
      }
    };
  }, [stamps, neededShopIds.length, focusedShopId, mapMode]);

  const handleFocus = (entityId: string, isRestaurant = false) => {
    if (mapMode === "google") {
      const s = SHOPS.find((x) => x.id === entityId);
      const r = EX_RESTAURANTS.find((x) => x.id === entityId);
      if (isRestaurant && r) {
        setSelectedEntity({ ...r, isRestaurant: true });
        showToastMsg(`Centrato su Ristorante: ${r.name} 🍽️`, "info");
      } else if (s) {
        setSelectedEntity({ ...s, isRestaurant: false });
        showToastMsg(`Centrato su Bottega: ${s.name} 📍`, "info");
      }
    } else if (mapRef.current) {
      if (isRestaurant) {
        const r = EX_RESTAURANTS.find((x) => x.id === entityId);
        if (r) {
          mapRef.current.setView([r.lat, r.lng], 17, { animate: true });
          showToastMsg(`Centrato su Ristorante: ${r.name} 🍽️`, "info");
        }
      } else {
        const s = SHOPS.find((x) => x.id === entityId);
        if (s) {
          mapRef.current.setView([s.lat, s.lng], 17, { animate: true });
          showToastMsg(`Centrato su Bottega: ${s.name} 📍`, "info");
        }
      }
    }
  };

  const handleToggleGoogleMaps = () => {
    if (hasValidKey) {
      showToastMsg("Google Maps Caricato con Successo! 🗺️", "success");
    } else {
      showToastMsg("Configura la chiave segreta GOOGLE_MAPS_PLATFORM_KEY per visualizzare la mappa interattiva.", "info");
    }
    setMapMode(mapMode === "standard" ? "google" : "standard");
  };

  return (
    <div className="flex flex-col min-h-[600px] animate-fade-in select-none text-slate-100">
      {/* Search Header */}
      <div className="px-5 pt-4 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[25px] font-bold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Tracciato Eno-Gastronomico
          </h2>
          <p className="text-[12.5px] text-orange-400 font-semibold mt-1">
            Visualizza le Botteghe Storiche e i Ristoranti Partner a Macerata e Tolentino
          </p>
        </div>

        {/* Google Maps Toggle Expansion */}
        <div className="self-start md:self-auto flex items-center gap-2">
          <button
            onClick={handleToggleGoogleMaps}
            className={`px-4 py-2 text-[11px] font-black rounded-xl border transition-all cursor-pointer ${
              mapMode === "google"
                ? "bg-amber-500 border-transparent text-slate-950 font-black shadow-md shadow-amber-500/10"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            🗺️ Selettore Google Maps Web API
          </button>
        </div>
      </div>

      {/* Google Maps Configuration Notification Banner */}
      <div className="mx-4 mb-4 p-4 rounded-2xl bg-slate-900 border border-slate-800/80 text-[11.5px] text-slate-300 flex items-start gap-3">
        <span className="text-[18px] shrink-0">🧭</span>
        <div>
          <b className="text-orange-400 block mb-0.5">Espansione Google Maps Platform:</b>
          I Ristoranti Partner e le Botteghe sono tracciati nel sistema cartografico.
          {hasValidKey ? (
            <span className="text-emerald-400 font-bold ml-1">✓ Google Maps API attiva con rendering avanzato in corso!</span>
          ) : (
            <span>
              {" "}Aggiungendo la chiave privata <code className="text-white font-mono bg-slate-950 px-1 rounded">GOOGLE_MAPS_PLATFORM_KEY</code> (o <code className="text-white font-mono bg-slate-950 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code>) nelle impostazioni di AI Studio l'interfaccia configurerà il caricamento asincrono.
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 pb-6 flex-1 items-stretch">
        {/* Map Element Container */}
        <div className="col-span-1 lg:col-span-8 flex flex-col min-h-[350px] lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative z-10">
          {mapMode === "google" ? (
            !hasValidKey ? (
              <div className="w-full h-full min-h-[350px] lg:h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <span className="text-[44px] mb-3">🗺️</span>
                <h3 className="text-[17px] font-extrabold text-white">Google Maps API Key Richiesta</h3>
                <p className="text-[12.5px] text-slate-400 mt-2 max-w-md leading-relaxed">
                  Per sbloccare la mappa interattiva avanzata di Google Maps, aggiungi la tua chiave segreta in AI Studio.
                </p>
                <div className="mt-4 p-4 rounded-2xl bg-slate-900 border border-slate-850 text-left max-w-sm space-y-2 text-[11px] text-slate-300">
                  <p><strong>1.</strong> <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline font-bold">Ottieni un'API Key di Google Maps</a></p>
                  <p><strong>2.</strong> Apri le <strong>Impostazioni</strong> (icona ⚙️ in alto a destra)</p>
                  <p><strong>3.</strong> Vai su <strong>Secrets</strong>, inserisci <code>GOOGLE_MAPS_PLATFORM_KEY</code></p>
                  <p><strong>4.</strong> Incolla la tua chiave come valore e premi invio.</p>
                </div>
                <button
                  onClick={() => setMapMode("standard")}
                  className="mt-5 px-4.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-extrabold text-[12px] rounded-xl transition active:scale-95 cursor-pointer"
                >
                  Torna alla Mappa Leaflet di Fallback
                </button>
              </div>
            ) : (
              <APIProvider apiKey={API_KEY} version="weekly">
                <div className="w-full h-full min-h-[350px] lg:h-full relative">
                  <GoogleMap
                    defaultCenter={{ lat: 43.2200, lng: 13.3500 }}
                    defaultZoom={11}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <MapController
                      focusedShopId={focusedShopId}
                      selectedEntity={selectedEntity}
                      setSelectedEntity={setSelectedEntity}
                    />
                  </GoogleMap>
                </div>
              </APIProvider>
            )
          ) : (
            <div id={mapContainerId} className="w-full h-full min-h-[350px] lg:h-full relative">
              <div className="absolute inset-0 bg-slate-950 flex items-center justify-center text-slate-500 text-[12.5px] z-0">
                Caricamento Mappa Maceratese...
              </div>
            </div>
          )}
        </div>

        {/* Panel Tabs (Botteghe + Ristoranti) */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
          {/* BOTTEGHE PARTNER */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 ml-1 font-mono flex items-center gap-2">
              <span>📍</span> <span>Botteghe Spesa Alimentari ({SHOPS.length})</span>
            </p>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden divide-y divide-slate-850">
              {SHOPS.slice(0, 3).map((s) => {
                const isDone = stamps.includes(s.id);
                const isNeeded = neededShopIds.includes(s.id);

                return (
                  <div key={s.id} className="flex items-center justify-between p-3.5 hover:bg-slate-950/45 transition-colors gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-slate-955 shrink-0 text-[14px] font-black ${
                          isDone
                            ? "bg-emerald-400 text-slate-950 font-extrabold"
                            : isNeeded
                            ? "bg-orange-500 text-slate-950 font-extrabold"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isDone ? "✓" : "📍"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-[13px] text-white flex items-center gap-1.5">
                          <span className="truncate">{s.name}</span>
                        </p>
                        <p className="text-[10.5px] text-slate-500 truncate mt-0.5 font-medium">
                          Codice QR: <code className="bg-slate-950 border border-slate-800 text-orange-400 px-1 rounded font-bold font-mono">{s.qr_secret}</code>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleFocus(s.id, false)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-[10.5px] font-bold rounded-lg active:scale-95 transition-all shrink-0 border border-slate-750 cursor-pointer"
                    >
                      Centra
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RISTORANTI PARTNER */}
          <div className="flex flex-col gap-2 mt-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 ml-1 font-mono flex items-center gap-2">
              <span>🍽️</span> <span>Ristoratori dell'Incoronazione ({EX_RESTAURANTS.length})</span>
            </p>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden divide-y divide-slate-850">
              {EX_RESTAURANTS.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3.5 hover:bg-slate-950/45 transition-colors gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center text-[15px] font-black shrink-0 shadow-sm shadow-amber-400/10">
                      🍽️
                    </div>
                    <div className="min-w-0 font-medium">
                      <p className="font-extrabold text-[13px] text-white flex items-center gap-1.5">
                        <span className="truncate">{r.name}</span>
                      </p>
                      <p className="text-[10.5px] text-slate-400 truncate mt-0.5 font-sans">
                        Spec: <span className="text-orange-400 font-semibold">{r.specialty}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleFocus(r.id, true)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-[10.5px] font-bold rounded-lg active:scale-95 transition-all shrink-0 border border-slate-755 cursor-pointer"
                  >
                    Centra
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
