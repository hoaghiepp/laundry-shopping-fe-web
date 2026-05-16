import {
  getGoshipLocationsSnapshot,
  subscribeGoshipLocations,
} from '@/lib/goshipLocations';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Select, SelectOption } from './Select';

interface DistrictSelectorProps {
  cityId?: string | number | null;
  value?: string | number | null;
  districtName?: string; // For name-based matching when editing
  onSelect: (districtId: string | number, districtName: string) => void;
  error?: string;
}

export const DistrictSelector: React.FC<DistrictSelectorProps> = ({
  cityId,
  value,
  districtName,
  onSelect,
  error,
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

  const districts: SelectOption[] = useMemo(() => {
    if (!cityId) return [];
    const cityIdStr = String(cityId);
    return (locationsSnap.districts || [])
      .filter((d) => (d.cityId === undefined ? true : String(d.cityId) === cityIdStr))
      .map((d) => ({ value: d.value, label: d.label }));
  }, [locationsSnap.districts, cityId]);

  const loading = locationsSnap.loading && districts.length === 0 && !!cityId;

  useEffect(() => {
    hasResolvedRef.current = false;

    if (!cityId) {
      setResolvedValue(null);
      return;
    }

    if (!districts.length) {
      setResolvedValue(value || null);
      return;
    }

    if (!value && districtName && !hasResolvedRef.current) {
      const foundDistrict = districts.find(
        (d) => d.label.toLowerCase() === districtName.toLowerCase()
      );
      if (foundDistrict) {
        setResolvedValue(foundDistrict.value);
        hasResolvedRef.current = true;
        onSelect(foundDistrict.value, foundDistrict.label);
        return;
      }
    }

    if (value) {
      setResolvedValue(value);
      hasResolvedRef.current = true;
    } else {
      setResolvedValue(value || null);
    }
  }, [cityId, districts, value, districtName, onSelect]);

  const handleSelect = (districtId: string | number) => {
    const selectedDistrict = districts.find((district) => district.value === districtId);
    onSelect(districtId, selectedDistrict?.label || '');
  };

  return (
    <Select
      label="Quận/Huyện"
      placeholder="Chọn quận/huyện"
      value={resolvedValue}
      options={districts}
      onSelect={handleSelect}
      error={error}
      loading={loading}
      disabled={!cityId}
    />
  );
};

