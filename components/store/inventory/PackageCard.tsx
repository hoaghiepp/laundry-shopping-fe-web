import { formatCurrencyVND } from '@/utils/format';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PackageItem {
    id: string;
    store_id: string;
    name: string;
    quantity: number;
    description: string;
    thumbnail_url: string;
    gallery_urls: string[];
    unit: string;
    price: number;
    priority: number;
    status?: string;
    service_product_id?: string;
}

interface PackageCardProps {
    packageItem: PackageItem;
    onPress: () => void;
    onAddStock: (itemName: string) => void;
}

export const PackageCard: React.FC<PackageCardProps> = ({
    packageItem,
    onPress,
    onAddStock,
}) => {
    const isLowStock = packageItem.quantity <= 10;

    return (
        <TouchableOpacity
            style={[styles.itemCard, isLowStock && styles.lowStockCard]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Image
                source={{ uri: packageItem.thumbnail_url }}
                style={styles.itemIcon}
                contentFit="contain"
            />
            <View style={styles.itemInfo}>
                <View style={styles.packageHeader}>
                    <Text style={styles.itemName}>{packageItem.name}</Text>
                    <View style={styles.packageBadge}>
                        <FontAwesome5 name="gift" size={8} color="#8B5CF6" />
                        <Text style={styles.packageBadgeText}>Gói</Text>
                    </View>
                </View>
                {packageItem.description && (
                    <Text style={styles.itemMeta} numberOfLines={1}>
                        {packageItem.description}
                    </Text>
                )}

                <View style={styles.itemFooter}>
                    {packageItem.price > 0 && (
                        <Text style={styles.itemPrice}>
                            {formatCurrencyVND(packageItem.price)}
                        </Text>
                    )}
                    <TouchableOpacity
                        style={[styles.addButton, isLowStock && styles.lowAddButton]}
                        onPress={(e) => {
                            e.stopPropagation();
                            onAddStock(packageItem.name);
                        }}
                        activeOpacity={0.7}
                    >

                        <FontAwesome5
                            name="plus"
                            size={8}
                            color={isLowStock ? '#D97706' : '#2563EB'}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.addButtonText, isLowStock && styles.lowAddButtonText]}>
                            Sửa
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    itemCard: {
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        flexDirection: 'row',
        gap: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    lowStockCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    itemIcon: {
        width: 56,
        height: 56,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemInfo: {
        flex: 1,
    },
    packageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    itemName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    packageBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F3E8FF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    packageBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#8B5CF6',
    },
    itemMeta: {
        fontSize: 10,
        color: '#6B7280',
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2563EB',
        marginBottom: 4,
    },
    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 4,
    },
    quantity: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#10B981',
    },
    lowQuantity: {
        color: '#F59E0B',
    },
    unit: {
        fontSize: 10,
        fontWeight: 'normal',
        color: '#9CA3AF',
    },
    addButton: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    lowAddButton: {
        backgroundColor: '#FEF3C7',
        borderColor: '#FDE68A',
    },
    addButtonText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#2563EB',
    },
    lowAddButtonText: {
        color: '#D97706',
    },
});

