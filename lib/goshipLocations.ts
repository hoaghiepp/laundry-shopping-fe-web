import { goshipService } from '@/services/api/goshipService';

export type GoshipCity = {
  id?: string | number;
  city_id?: string | number;
  name?: string;
  city_name?: string;
  title?: string;
};

export type GoshipDistrict = {
  id?: string | number;
  district_id?: string | number;
  name?: string;
  district_name?: string;
  title?: string;
  city_id?: string | number;
  city?: { id?: string | number };
};

export type GoshipSelectOption = {
  value: string | number;
  label: string;
};

export type GoshipDistrictOption = GoshipSelectOption & {
  cityId?: string | number;
};

type LocationsState = {
  loading: boolean;
  hydrated: boolean;
  error: string | null;
  cities: GoshipSelectOption[];
  districts: GoshipDistrictOption[];
};

let state: LocationsState = {
  loading: false,
  hydrated: false,
  error: null,
  cities: [],
  districts: [],
};

let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(patch: Partial<LocationsState>) {
  state = { ...state, ...patch };
  emit();
}

export function getGoshipLocationsSnapshot(): LocationsState {
  return state;
}

export function subscribeGoshipLocations(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function prefetchGoshipLocations(): Promise<void> {
  if (state.hydrated) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      setState({ loading: true, error: null });

      const client = goshipService.getAxiosInstance();
      const [citiesRes, districtsRes] = await Promise.all([
        client.get('/cities'),
        client.get('/districts', { params: { size: 1000, per_page: 1000 } }),
      ]);

      const citiesRaw: GoshipCity[] = citiesRes?.data?.data ?? citiesRes?.data ?? [];
      const districtsRaw: GoshipDistrict[] = districtsRes?.data?.data ?? districtsRes?.data ?? [];

      const cities: GoshipSelectOption[] = (citiesRaw || []).map((city) => ({
        value: (city.id ?? city.city_id) as string | number,
        label: city.name || city.city_name || city.title || 'Không có tên',
      }));

      const districts: GoshipDistrictOption[] = (districtsRaw || []).map((district) => ({
        value: (district.id ?? district.district_id) as string | number,
        label: district.name || district.district_name || district.title || 'Không có tên',
        cityId: district.city_id ?? district.city?.id,
      }));

      setState({
        cities,
        districts,
        hydrated: true,
      });
    } catch (e: any) {
      setState({
        error: e?.message ? String(e.message) : 'Failed to prefetch goship locations',
        cities: [],
        districts: [],
        hydrated: false,
      });
    } finally {
      setState({ loading: false });
      inFlight = null;
    }
  })();

  return inFlight;
}

