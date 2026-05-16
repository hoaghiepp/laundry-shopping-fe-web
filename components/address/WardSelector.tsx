import { goshipService } from '@/services/api/goshipService';
import React, { useEffect, useRef, useState } from 'react';
import { Select, SelectOption } from './Select';

interface WardSelectorProps {
  districtId?: string | number | null;
  value?: string | number | null;
  wardName?: string; // For name-based matching when editing
  onSelect: (wardId: string | number, wardName: string) => void;
  error?: string;
}

export const WardSelector: React.FC<WardSelectorProps> = ({
  districtId,
  value,
  wardName,
  onSelect,
  error,
}) => {
  const [wards, setWards] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvedValue, setResolvedValue] = useState<string | number | null>(value || null);
  const hasResolvedRef = useRef(false);

  useEffect(() => {
    // Reset ref when dependencies change
    hasResolvedRef.current = false;
    
    const fetchWards = async () => {
      if (!districtId) {
        setWards([]);
        return;
      }

      try {
        setLoading(true);
        const allWards: any[] = [];
        let page = 1;
        const size = 25;
        let hasMore = true;

        while (hasMore) {
          const response = await goshipService.getWards(districtId, { 
            page, 
            size
          });
          
          allWards.push(...response.data);
          
          // Check if there are more pages to fetch
          // If response length equals size, there might be more pages
          if (response.data.length === size && response.meta?.pagination) {
            const { current_page, total_pages } = response.meta.pagination;
            hasMore = current_page < total_pages;
            page++;
          } else {
            hasMore = false;
          }
        }

        const wardOptions: SelectOption[] = allWards.map((ward: any) => ({
          value: ward.id || ward.ward_id,
          label: ward.name || ward.ward_name || ward.title || 'Không có tên',
        }));
        setWards(wardOptions);

        // If value is null but wardName is provided, try to find by name
        if (!value && wardName && wardOptions.length > 0 && !hasResolvedRef.current) {
          const foundWard = wardOptions.find(
            (ward) => ward.label.toLowerCase() === wardName.toLowerCase()
          );
          if (foundWard) {
            setResolvedValue(foundWard.value);
            hasResolvedRef.current = true;
            // Update parent state when resolving from name
            onSelect(foundWard.value, foundWard.label);
          }
        } else if (value) {
          setResolvedValue(value);
          hasResolvedRef.current = true;
        } else {
          setResolvedValue(value || null);
        }
      } catch (error) {
        console.error('Failed to fetch wards:', error);
        setWards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId, value, wardName]);

  const handleSelect = (wardId: string | number) => {
    const selectedWard = wards.find((ward) => ward.value === wardId);
    onSelect(wardId, selectedWard?.label || '');
  };

  return (
    <Select
      label="Phường/Xã"
      placeholder="Chọn phường/xã"
      value={resolvedValue}
      options={wards}
      onSelect={handleSelect}
      error={error}
      loading={loading}
      disabled={!districtId}
    />
  );
};


