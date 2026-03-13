import { RequestHandler } from "express";
import path from "path";
import { promises as fs } from "fs";
import { RainySitesResponse, RainySite, UploadEntry, WorkerHealthEntry } from "@shared/api";

const DATA_DIR = path.join(process.cwd(), "server/data");
const UPLOADS_FILE = path.join(DATA_DIR, "uploads.json");
const WORKERS_FILE = path.join(DATA_DIR, "workers.json");

async function ensureDataDirectory(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readJsonFile<T>(filePath: string): Promise<T[]> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function getUniqueSiteLocations(): Promise<string[]> {
  const uploads = await readJsonFile<UploadEntry>(UPLOADS_FILE);
  const workers = await readJsonFile<WorkerHealthEntry>(WORKERS_FILE);
  const locations = new Set<string>();
  uploads.forEach(u => { if (u.siteLocation) locations.add(u.siteLocation); });
  workers.forEach(w => { if (w.siteLocation) locations.add(w.siteLocation); });
  return Array.from(locations);
}

async function geocodeLocation(name: string, apiKey: string): Promise<{ lat: number; lon: number } | null> {
  const url = new URL("https://api.openweathermap.org/geo/1.0/direct");
  url.searchParams.set("q", name);
  url.searchParams.set("limit", "1");
  url.searchParams.set("appid", apiKey);

  const resp = await fetch(url.toString());
  if (!resp.ok) return null;
  const json = await resp.json();
  if (Array.isArray(json) && json.length > 0 && typeof json[0].lat === "number" && typeof json[0].lon === "number") {
    return { lat: json[0].lat, lon: json[0].lon };
  }
  return null;
}

async function fetchForecast(lat: number, lon: number, apiKey: string): Promise<any | null> {
  const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");

  const resp = await fetch(url.toString());
  if (!resp.ok) return null;
  return resp.json();
}

function willRainWithinHours(forecast: any, hours: number): { firstRainAt?: string; probability?: number; rainVolumeMm?: number } | null {
  try {
    const now = Date.now();
    const windowMs = hours * 3600 * 1000;
    const list = Array.isArray(forecast?.list) ? forecast.list : [];
    for (const slot of list) {
      const slotTimeMs = (slot.dt ?? 0) * 1000;
      if (slotTimeMs >= now && slotTimeMs <= now + windowMs) {
        const hasRainWeather = Array.isArray(slot.weather) && slot.weather.some((w: any) => String(w.main).toLowerCase() === "rain");
        const rainVolume = slot.rain?.["3h"] ?? slot.rain ?? 0;
        const pop = typeof slot.pop === "number" ? slot.pop : undefined;
        if (hasRainWeather || (typeof rainVolume === "number" && rainVolume > 0) || (typeof pop === "number" && pop >= 0.3)) {
          return {
            firstRainAt: new Date(slotTimeMs).toISOString(),
            probability: pop,
            rainVolumeMm: typeof rainVolume === "number" ? rainVolume : undefined,
          };
        }
      }
    }
  } catch {}
  return null;
}

export const handleGetRainySites: RequestHandler = async (req, res) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ hours: 0, locations: [] } as RainySitesResponse);
    }

    const hours = Math.max(1, Math.min(24, Number(req.query.hours) || 6));
    const locations = await getUniqueSiteLocations();

    const rainy: RainySite[] = [];
    for (const loc of locations) {
      const coords = await geocodeLocation(loc, apiKey);
      if (!coords) continue;
      const forecast = await fetchForecast(coords.lat, coords.lon, apiKey);
      if (!forecast) continue;
      const rainInfo = willRainWithinHours(forecast, hours);
      if (rainInfo) {
        rainy.push({ siteLocation: loc, ...rainInfo });
      }
    }

    const response: RainySitesResponse = {
      hours,
      locations: rainy,
    };
    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching rainy sites:", err);
    res.status(500).json({ hours: 0, locations: [] } as RainySitesResponse);
  }
};