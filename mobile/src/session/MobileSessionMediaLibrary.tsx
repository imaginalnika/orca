import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { Images, Maximize2, Minimize2, X } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'
import { BottomDrawer } from '../components/BottomDrawer'
import { PickerListDrawer } from '../components/PickerListDrawer'
import type { MobileSessionMediaLibrary as LibraryState } from './use-mobile-session-media-library'

type Props = {
  library: LibraryState
}

export function MobileSessionMediaLibrary({ library }: Props): React.JSX.Element {
  const viewerVisible = library.selectedItem != null

  return (
    <>
      <PickerListDrawer
        visible={library.listOpen}
        title="Session media"
        items={library.items.map((item) => ({
          id: item.id,
          label: item.label || item.id,
          detail: item.kind
        }))}
        selectedId={library.selectedItem?.id ?? ''}
        onSelect={(row) => {
          const item = library.items.find((candidate) => candidate.id === row.id)
          if (item) {
            library.selectItem(item)
          }
        }}
        onClose={library.closeList}
        renderIcon={() => <Images size={16} color={colors.textSecondary} strokeWidth={2} />}
      />
      <BottomDrawer
        visible={viewerVisible && !library.fullscreen}
        onClose={library.closeViewer}
        dragContentToDismiss
        contentScrollable={false}
      >
        {viewerVisible ? (
          <SessionMediaViewerBody
            key={library.selectedItem?.id}
            library={library}
            fullscreen={false}
          />
        ) : null}
      </BottomDrawer>
      {viewerVisible && library.fullscreen ? (
        <View style={styles.fullscreen} testID="session-media-fullscreen">
          <SessionMediaViewerBody
            key={`${library.selectedItem?.id}-full`}
            library={library}
            fullscreen
          />
        </View>
      ) : null}
    </>
  )
}

function SessionMediaViewerBody({
  library,
  fullscreen
}: {
  library: LibraryState
  fullscreen: boolean
}): React.JSX.Element {
  const item = library.selectedItem
  const preview = library.preview
  const [decodeFailed, setDecodeFailed] = useState(false)
  const showRecovery = decodeFailed || preview.status === 'decode_failed'
  return (
    <View
      style={fullscreen ? styles.fullscreenBody : styles.sheetBody}
      testID="session-media-viewer"
    >
      <View style={styles.viewerHeader}>
        <Text style={styles.viewerTitle} numberOfLines={1}>
          {item?.label || item?.id || 'Media'}
        </Text>
        <Pressable
          accessibilityLabel={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          onPress={() => library.setFullscreen(!fullscreen)}
        >
          {fullscreen ? (
            <Minimize2 size={18} color={colors.textSecondary} strokeWidth={2} />
          ) : (
            <Maximize2 size={18} color={colors.textSecondary} strokeWidth={2} />
          )}
        </Pressable>
        <Pressable
          accessibilityLabel="Close media"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          onPress={library.closeViewer}
        >
          <X size={18} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>
      <View style={fullscreen ? styles.fullscreenStage : styles.sheetStage}>
        {preview.status === 'loading' ? (
          <Text style={styles.recovery}>Loading…</Text>
        ) : showRecovery ? (
          <Text style={styles.recovery}>
            Couldn’t decode this take. The map still has the path.
          </Text>
        ) : preview.status === 'ready' && preview.kind === 'image' ? (
          <Image
            source={{ uri: preview.dataUri }}
            style={styles.media}
            resizeMode="contain"
            onError={() => setDecodeFailed(true)}
          />
        ) : preview.status === 'ready' ? (
          <WebView
            source={{ html: avHtml(preview.dataUri, preview.kind) }}
            style={styles.media}
            originWhitelist={['*']}
            onError={() => setDecodeFailed(true)}
          />
        ) : (
          <Text style={styles.recovery}>
            Couldn’t decode this take. The map still has the path.
          </Text>
        )}
      </View>
    </View>
  )
}

function avHtml(dataUri: string, kind: 'video' | 'audio' | 'image'): string {
  const tag = kind === 'audio' ? 'audio' : 'video'
  return `<!doctype html><html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100%">
<${tag} src="${dataUri}" controls autoplay style="max-width:100%;max-height:100%"></${tag}>
</body></html>`
}

const styles = StyleSheet.create({
  sheetBody: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md
  },
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgBase,
    zIndex: 40
  },
  fullscreenBody: {
    flex: 1,
    paddingTop: spacing.lg
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44
  },
  viewerTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.bodySize
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetStage: {
    height: 220,
    borderRadius: radii.card,
    backgroundColor: colors.bgRaised,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fullscreenStage: {
    flex: 1,
    backgroundColor: colors.bgRaised,
    alignItems: 'center',
    justifyContent: 'center'
  },
  media: {
    width: '100%',
    height: '100%'
  },
  recovery: {
    color: colors.textMuted,
    fontSize: typography.metaSize,
    paddingHorizontal: spacing.md,
    textAlign: 'center'
  },
  pressed: {
    opacity: 0.7
  }
})
