import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Platform,
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type TextStyle,
    type ViewProps,
    type ViewStyle,
} from 'react-native';

type WebHoverProps = Pick<ViewProps, 'onMouseEnter' | 'onMouseLeave'>;

interface ReportHoverTooltipProps {
  text: string;
  lines?: string[];
  children: React.ReactNode;
  placement?: 'top' | 'bottom';
  style?: StyleProp<ViewStyle>;
}

const WebTooltipPortal: React.FC<{
  lines: string[];
  anchor: { x: number; y: number; w: number; h: number };
  placement: 'top' | 'bottom';
}> = ({ lines, anchor, placement }) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left: anchor.x + anchor.w / 2,
        top: placement === 'bottom' ? anchor.y + anchor.h + 10 : anchor.y - 10,
        transform: placement === 'bottom' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
        zIndex: 99999,
        pointerEvents: 'none',
        backgroundColor: '#111827',
        borderRadius: 10,
        padding: '14px 18px',
        minWidth: 200,
        maxWidth: 480,
        boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {lines.map((line, index) => (
        <div
          key={`${index}-${line}`}
          style={{
            color: '#F9FAFB',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: '22px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {line}
        </div>
      ))}
    </div>,
    document.body
  );
};

export const ReportHoverTooltip: React.FC<ReportHoverTooltipProps> = ({
  text,
  lines: linesProp,
  children,
  placement = 'top',
  style,
}) => {
  const wrapRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const lines = useMemo(() => {
    if (linesProp?.length) return linesProp.filter((l) => l.trim().length > 0);
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }, [text, linesProp]);

  const measureAnchor = useCallback(() => {
    wrapRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
    });
  }, []);

  const handleEnter = useCallback(() => {
    measureAnchor();
    setVisible(true);
  }, [measureAnchor]);

  const handleLeave = useCallback(() => {
    setVisible(false);
  }, []);

  if (lines.length === 0) {
    return <>{children}</>;
  }

  const hoverHandlers: WebHoverProps = {
    onMouseEnter: handleEnter,
    onMouseLeave: handleLeave,
  };

  const usePortal = Platform.OS === 'web';

  return (
    <View ref={wrapRef} style={[styles.wrap, style]} {...hoverHandlers}>
      {children}
      {visible && usePortal ? (
        <WebTooltipPortal lines={lines} anchor={anchor} placement={placement} />
      ) : null}
      {visible && !usePortal ? (
        <View
          style={[
            styles.tooltip,
            styles.tooltipExpanded,
            placement === 'bottom' ? styles.tooltipBottom : styles.tooltipTop,
          ]}
          pointerEvents="none"
        >
          {lines.map((line, index) => (
            <Text
              key={`${index}-${line}`}
              style={[styles.tooltipLine, Platform.OS === 'web' ? styles.tooltipLineWeb : null]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 1000,
    backgroundColor: '#111827',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  tooltipExpanded: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    minWidth: 200,
    maxWidth: 480,
    gap: 8,
  },
  tooltipTop: {
    bottom: '100%',
    marginBottom: 10,
  },
  tooltipBottom: {
    top: '100%',
    marginTop: 10,
  },
  tooltipLine: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
    width: '100%',
  },
  tooltipLineWeb: {
    whiteSpace: 'nowrap',
  } as TextStyle,
});
