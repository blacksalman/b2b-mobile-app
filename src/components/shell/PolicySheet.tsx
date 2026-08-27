import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ds, dsRadii, dsSpacing, dsType } from '@/theme';
import { CloseIcon } from '@/icons';

// Shared bottom-sheet popup for showing a policy's title + body - originally only on
// account.tsx (Policies/About sections), now reused by checkout.tsx's Return/Shipping rows too,
// which previously just fired a toast instead of actually opening anything (see the "popup is
// not visible only alert is showing" report). `policy` null just keeps the Modal closed
// (`visible={!!policy}`) rather than the caller needing its own guard.
interface PolicySheetProps {
  policy: { title: string; body: string } | null;
  onClose: () => void;
}

export function PolicySheet({ policy, onClose }: PolicySheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={!!policy} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
        <View style={styles.grabberRow}>
          <View style={styles.grabber} />
        </View>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle} numberOfLines={1}>
            {policy?.title}
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={4}>
            <CloseIcon size={14} color={ds.ink} strokeWidth={2.2} />
          </Pressable>
        </View>
        <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetBodyContent}>
          <Text style={styles.sheetBodyText}>{policy?.body}</Text>
        </ScrollView>
        <View style={styles.sheetFooter}>
          <Pressable onPress={onClose} style={styles.sheetCloseButton}>
            <Text style={styles.sheetCloseButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(12,71,51,.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    backgroundColor: ds.surface,
    borderTopLeftRadius: dsRadii.sheet,
    borderTopRightRadius: dsRadii.sheet,
    overflow: 'hidden',
  },
  grabberRow: { alignItems: 'center', paddingTop: dsSpacing.sm },
  grabber: { width: 36, height: 4, borderRadius: dsRadii.pill, backgroundColor: ds.lineStrong },
  sheetHeader: {
    paddingHorizontal: dsSpacing.lg,
    paddingTop: dsSpacing.sm,
    paddingBottom: dsSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dsSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ds.line,
  },
  sheetTitle: { ...dsType.h2, flex: 1, minWidth: 0 },
  closeButton: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: dsRadii.button,
    backgroundColor: ds.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: { flexGrow: 0 },
  sheetBodyContent: { padding: dsSpacing.lg },
  sheetBodyText: { ...dsType.body, color: ds.ink2 },
  sheetFooter: {
    borderTopWidth: 1,
    borderTopColor: ds.line,
    padding: dsSpacing.md,
    paddingHorizontal: dsSpacing.lg,
  },
  sheetCloseButton: {
    height: 48,
    borderRadius: dsRadii.button,
    backgroundColor: ds.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseButtonText: { ...dsType.title, color: ds.surface },
});
