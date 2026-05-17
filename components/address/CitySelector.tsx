import { getGoshipLocationsSnapshot, subscribeGoshipLocations } from '@/lib/goshipLocations';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Select, SelectOption } from './Select';

interface CitySelectorProps {
  value?: string | number | null;
  cityName?: string; // For name-based matching when editing
  onSelect: (cityId: string | number, cityName: string) => void;
  error?: string;
  compact?: boolean;
}

export const CitySelector: React.FC<CitySelectorProps> = ({
  value,
  cityName,
  onSelect,
  error,
  compact = false,
}) => {
  const [locationsSnap, setLocationsSnap] = useState(getGoshipLocationsSnapshot());
  const [resolvedValue, setResolvedValue] = useState<string | number | null>(value || null);
  const hasResolvedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeGoshipLocations(() =>
      setLocationsSnap(getGoshipLocationsSnapshot())
    );
    return () => {
      unsubscribe();
    };
  }, []);

  const cities: SelectOption[] = useMemo(() => locationsSnap.cities, [locationsSnap.cities]);
  const loading = locationsSnap.loading && cities.length === 0;

  useEffect(() => {
    hasResolvedRef.current = false;

    if (!cities.length) {
      setResolvedValue(value || null);
      return;
    }

    if (!value && cityName && !hasResolvedRef.current) {
      const foundCity = cities.find((c) => c.label.toLowerCase() === cityName.toLowerCase());
      if (foundCity) {
        setResolvedValue(foundCity.value);
        hasResolvedRef.current = true;
        onSelect(foundCity.value, foundCity.label);
        return;
      }
    }

    if (value) {
      setResolvedValue(value);
      hasResolvedRef.current = true;
    } else {
      setResolvedValue(value || null);
    }
  }, [cities, value, cityName, onSelect]);

  const handleSelect = (cityId: string | number) => {
    const selectedCity = cities.find((city) => city.value === cityId);
    onSelect(cityId, selectedCity?.label || '');
  };

  return (
    <Select
      label="Tỉnh/Thành phố"
      placeholder="Chọn tỉnh/thành phố"
      value={resolvedValue}
      options={cities}
      onSelect={handleSelect}
      error={error}
      loading={loading}
      compact={compact}
    />
  );
};


