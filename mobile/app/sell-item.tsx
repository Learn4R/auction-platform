import { useEffect, useState } from 'react'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { DateTimeField } from '../components/DateTimeField'
import { Text } from '../components/Text'
import { TextInput } from '../components/TextInput'
import { colors } from '../constants/colors'
import {
  getCategories,
  getMyItems,
  resubmitItem,
  submitItem,
  updateItem,
  type Category,
  type ItemImagePick,
  type ItemSubmission,
} from '../lib/api'
import { useAuth } from '../lib/auth'

const MAX_IMAGES = 6

const emptyForm = {
  categoryId: '',
  title: '',
  year: '',
  denomination: '',
  mint: '',
  rulerAuthority: '',
  period: '',
  material: '',
  weight: '',
  diameter: '',
  description: '',
  condition: '',
  grade: '',
  certificateNumber: '',
  gradingCompany: '',
  provenance: '',
  startingBid: '',
  bidIncrement: '',
  startTime: '',
  endTime: '',
}

type Form = typeof emptyForm

// A photo already on the item (identified by its uploaded URL, kept via
// keepImageUrls on submit) vs one newly picked on this screen (uploaded
// fresh). Only relevant in edit mode — a brand-new submission's images are
// all 'new'. Web's Sell.tsx uses the same existing/new split for the same
// reason: the server needs to know which existing photos to keep vs delete,
// separately from which new files to upload.
type Photo = { kind: 'existing'; url: string } | { kind: 'new'; pick: ItemImagePick }

function photoUri(photo: Photo): string {
  return photo.kind === 'existing' ? photo.url : photo.pick.uri
}

function isNewPhoto(photo: Photo): photo is Extract<Photo, { kind: 'new' }> {
  return photo.kind === 'new'
}

function isExistingPhoto(photo: Photo): photo is Extract<Photo, { kind: 'existing' }> {
  return photo.kind === 'existing'
}

function formFromItem(item: ItemSubmission): Form {
  return {
    categoryId: item.category?.id ?? '',
    title: item.title ?? '',
    year: item.year !== null ? String(item.year) : '',
    denomination: item.denomination ?? '',
    mint: item.mint ?? '',
    rulerAuthority: item.rulerAuthority ?? '',
    period: item.period ?? '',
    material: item.material ?? '',
    weight: item.weight ?? '',
    diameter: item.diameter ?? '',
    description: item.description ?? '',
    condition: item.condition ?? '',
    grade: item.grade ?? '',
    certificateNumber: item.certificateNumber ?? '',
    gradingCompany: item.gradingCompany ?? '',
    provenance: item.provenance ?? '',
    startingBid: item.proposedStartingBid ?? '',
    bidIncrement: item.proposedBidIncrement ?? '',
    startTime: item.proposedStartTime ?? '',
    endTime: item.proposedEndTime ?? '',
  }
}

function assetToImagePick(asset: ImagePicker.ImagePickerAsset, index: number): ItemImagePick {
  const ext = asset.mimeType?.split('/')[1] ?? 'jpg'
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}-${index}.${ext}`,
    type: asset.mimeType ?? 'image/jpeg',
    // Only set on expo-image-picker's web implementation — carried through
    // so submitItem can append the real File there instead of the
    // native-only {uri, name, type} shape.
    webFile: asset.file,
  }
}

function validate(form: Form, images: Photo[]): string | null {
  if (!form.categoryId) return 'Please choose a category.'
  if (!form.title.trim()) return 'Title is required.'
  if (!form.description.trim()) return 'Description is required.'
  if (form.year && !Number.isInteger(Number(form.year))) return 'Year must be a whole number.'
  if (images.length === 0) return 'Add at least one photo of the item.'
  if (!form.startingBid || Number(form.startingBid) <= 0) return 'Starting bid must be a positive number.'
  if (!form.bidIncrement || Number(form.bidIncrement) <= 0) return 'Bid increment must be a positive number.'
  if (!form.startTime) return 'Start time is required.'
  if (!form.endTime) return 'End time is required.'
  if (new Date(form.startTime) >= new Date(form.endTime)) return 'Start time must be before end time.'
  return null
}

// Reuses POST /api/items — the same submission endpoint the web wizard's
// final "Submit for Review" step calls — just as a single scrollable form
// instead of a multi-step wizard, per this phase's brief. Approved sellers
// only; the server itself also enforces this (403 otherwise).
//
// Edit mode (?editId=<id>) reuses this exact same form/state instead of a
// second screen — the item's current data (including its existing photos,
// as 'existing'-kind Photos) is loaded once via getMyItems and used to seed
// `form`/`images`, then submit calls updateItem + resubmitItem instead of
// submitItem. Mirrors client/src/pages/Sell.tsx's isEditing branch.
export default function SellItem() {
  const { editId } = useLocalSearchParams<{ editId?: string }>()
  const { token } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<Form>(emptyForm)
  const [images, setImages] = useState<Photo[]>([])
  const [imageError, setImageError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submittedTitle, setSubmittedTitle] = useState<string | null>(null)
  const [loadingEditItem, setLoadingEditItem] = useState(!!editId)
  const [editItemNotFound, setEditItemNotFound] = useState(false)

  useEffect(() => {
    getCategories()
      .then((cats) => {
        setCategories(cats)
        setForm((f) => (f.categoryId ? f : { ...f, categoryId: cats[0]?.id ?? '' }))
      })
      .catch(() => {})
  }, [])

  // There's no single-item-by-id endpoint for sellers, so this re-fetches
  // the whole list and finds the one being edited — the same data
  // my-listings.tsx just displayed, one screen back.
  useEffect(() => {
    if (!editId || !token) return
    getMyItems(token)
      .then((items) => {
        const item = items.find((i) => i.id === editId)
        if (!item) {
          setEditItemNotFound(true)
          return
        }
        setForm(formFromItem(item))
        setImages(item.images.map((url): Photo => ({ kind: 'existing', url })))
      })
      .catch(() => setEditItemNotFound(true))
      .finally(() => setLoadingEditItem(false))
  }, [editId, token])

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function addAssets(assets: ImagePicker.ImagePickerAsset[]) {
    setImageError(null)
    if (images.length + assets.length > MAX_IMAGES) {
      setImageError(`You can upload up to ${MAX_IMAGES} images (${images.length} already added).`)
      return
    }
    setImages((prev) => [
      ...prev,
      ...assets.map((a, i): Photo => ({ kind: 'new', pick: assetToImagePick(a, prev.length + i) })),
    ])
  }

  // On native, permission must be requested and awaited before launching.
  // On web there's no real permission system — expo-image-picker's web
  // implementation always resolves both request*PermissionsAsync calls as
  // already granted — and awaiting them first is actively harmful there:
  // the browser only allows a hidden file input's programmatic .click() to
  // open the real file/camera dialog while it's still inside the original
  // user-gesture call stack, and any await before that point (even one that
  // resolves immediately) loses that window, so the "dialog" silently
  // no-ops with `{canceled: true}`. So on web, skip straight to launching.
  async function takePhoto() {
    setImageError(null)
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        setImageError('Camera permission is required to take a photo.')
        return
      }
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
    if (!result.canceled && result.assets) addAssets(result.assets)
  }

  async function pickFromLibrary() {
    setImageError(null)
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        setImageError('Photo library permission is required to choose a photo.')
        return
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
    })
    if (!result.canceled && result.assets) addAssets(result.assets)
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!token) return
    const message = validate(form, images)
    if (message) {
      setError(message)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const fields = {
        title: form.title,
        description: form.description,
        categoryId: form.categoryId,
        year: form.year ? Number(form.year) : null,
        material: form.material,
        condition: form.condition,
        denomination: form.denomination,
        mint: form.mint,
        rulerAuthority: form.rulerAuthority,
        period: form.period,
        weight: form.weight,
        diameter: form.diameter,
        grade: form.grade,
        certificateNumber: form.certificateNumber,
        gradingCompany: form.gradingCompany,
        provenance: form.provenance,
        images: images.filter(isNewPhoto).map((p) => p.pick),
        startingBid: Number(form.startingBid),
        bidIncrement: Number(form.bidIncrement),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      }

      if (editId) {
        const keepImageUrls = images.filter(isExistingPhoto).map((p) => p.url)
        await updateItem(editId, { ...fields, keepImageUrls }, token)
        const result = await resubmitItem(editId, token)
        setSubmittedTitle(result.title ?? form.title)
        return
      }

      const item = await submitItem(fields, token)
      setSubmittedTitle(item.title)
      setForm({ ...emptyForm, categoryId: categories[0]?.id ?? '' })
      setImages([])
    } catch (err) {
      setError(err instanceof Error ? err.message : editId ? 'Resubmission failed' : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const isEditing = !!editId
  const screenTitle = isEditing ? 'Edit & Resubmit Item' : 'Sell an Item'

  // Edit-and-resubmit is reached by pushing this screen on top of My
  // Listings, so returning there is a plain stack pop — guaranteed to land
  // back on that exact existing instance (which shows the item's new
  // 'submitted' status via its own refetch-on-focus) rather than risking a
  // duplicate via a fresh navigation. Briefly show the confirmation above,
  // then pop back.
  useEffect(() => {
    if (!isEditing || !submittedTitle) return
    const timer = setTimeout(() => router.back(), 1400)
    return () => clearTimeout(timer)
  }, [isEditing, submittedTitle])

  if (loadingEditItem) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: screenTitle }} />
        <View style={styles.center} testID="sell-item-loading">
          <ActivityIndicator color={colors.royal} />
        </View>
      </>
    )
  }

  if (editItemNotFound) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: screenTitle }} />
        <View style={styles.center} testID="sell-item-not-found">
          <Text style={styles.errorText}>This listing couldn&apos;t be found.</Text>
          <Pressable onPress={() => router.replace('/my-listings')}>
            <Text style={styles.notFoundLink}>Back to My Listings →</Text>
          </Pressable>
        </View>
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: screenTitle }} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} testID="sell-item-form">
          <Text style={styles.intro}>
            {isEditing
              ? 'Update your listing to address the feedback below, then resubmit it for review.'
              : 'Submit a lot for review. Once approved by our team, it goes live for bidding with the auction settings you propose below.'}
          </Text>

          {submittedTitle && (
            <View style={styles.successBox} testID="sell-item-success">
              <Text style={styles.successText}>
                <Text style={styles.successBold}>{submittedTitle}</Text>{' '}
                {isEditing ? 'was resubmitted and is now pending review.' : 'was submitted and is now pending review.'}
              </Text>
              <Pressable onPress={() => (isEditing ? router.back() : router.replace('/my-listings'))}>
                <Text style={styles.successLink}>{isEditing ? 'Back to My Listings →' : 'View My Listings →'}</Text>
              </Pressable>
            </View>
          )}

          <Text variant="mono" style={styles.sectionTitle}>
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} testID="category-picker">
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => update('categoryId', cat.id)}
                style={[styles.chip, form.categoryId === cat.id && styles.chipActive]}
                testID={`category-chip-${cat.id}`}
              >
                <Text style={[styles.chipText, form.categoryId === cat.id && styles.chipTextActive]}>{cat.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text variant="mono" style={styles.sectionTitle}>
            Item Details
          </Text>
          <Field label="Title">
            <TextInput style={styles.input} value={form.title} onChangeText={(v) => update('title', v)} testID="sell-title" />
          </Field>
          <Field label="Description">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(v) => update('description', v)}
              multiline
              numberOfLines={4}
              testID="sell-description"
            />
          </Field>
          <View style={styles.row}>
            <Field label="Year" style={styles.half}>
              <TextInput style={styles.input} value={form.year} onChangeText={(v) => update('year', v)} keyboardType="number-pad" />
            </Field>
            <Field label="Denomination" style={styles.half}>
              <TextInput style={styles.input} value={form.denomination} onChangeText={(v) => update('denomination', v)} placeholder="e.g. One Rupee" />
            </Field>
          </View>
          <View style={styles.row}>
            <Field label="Mint" style={styles.half}>
              <TextInput style={styles.input} value={form.mint} onChangeText={(v) => update('mint', v)} placeholder="e.g. Calcutta" />
            </Field>
            <Field label="Ruler / Authority" style={styles.half}>
              <TextInput style={styles.input} value={form.rulerAuthority} onChangeText={(v) => update('rulerAuthority', v)} placeholder="e.g. George V" />
            </Field>
          </View>
          <View style={styles.row}>
            <Field label="Period" style={styles.half}>
              <TextInput style={styles.input} value={form.period} onChangeText={(v) => update('period', v)} placeholder="e.g. British India" />
            </Field>
            <Field label="Material" style={styles.half}>
              <TextInput style={styles.input} value={form.material} onChangeText={(v) => update('material', v)} />
            </Field>
          </View>
          <View style={styles.row}>
            <Field label="Weight" style={styles.half}>
              <TextInput style={styles.input} value={form.weight} onChangeText={(v) => update('weight', v)} placeholder="e.g. 11.66 g" />
            </Field>
            <Field label="Diameter" style={styles.half}>
              <TextInput style={styles.input} value={form.diameter} onChangeText={(v) => update('diameter', v)} placeholder="e.g. 30.5 mm" />
            </Field>
          </View>

          <Text variant="mono" style={styles.sectionTitle}>
            Photos (up to {MAX_IMAGES})
          </Text>
          <View style={styles.thumbRow} testID="sell-item-images">
            {images.map((img, i) => (
              <View key={photoUri(img)} style={styles.thumbWrap}>
                <Image source={{ uri: photoUri(img) }} style={styles.thumb} contentFit="cover" testID={`sell-item-thumb-${i}`} />
                <Pressable style={styles.removeThumb} onPress={() => removeImage(i)} testID={`sell-item-remove-image-${i}`}>
                  <Text style={styles.removeThumbText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <View style={styles.photoButtonRow}>
            <Pressable style={styles.photoButton} onPress={takePhoto} testID="sell-item-take-photo">
              <Text style={styles.photoButtonText}>📷 Take Photo</Text>
            </Pressable>
            <Pressable style={styles.photoButton} onPress={pickFromLibrary} testID="sell-item-pick-photo">
              <Text style={styles.photoButtonText}>🖼 Choose Photo</Text>
            </Pressable>
          </View>
          {imageError && (
            <Text style={styles.errorText} testID="sell-item-image-error">
              {imageError}
            </Text>
          )}

          <Text variant="mono" style={styles.sectionTitle}>
            Authenticity & Condition
          </Text>
          <Field label="Condition">
            <TextInput style={styles.input} value={form.condition} onChangeText={(v) => update('condition', v)} placeholder="e.g. Extremely Fine" />
          </Field>
          <View style={styles.row}>
            <Field label="Grade" style={styles.half}>
              <TextInput style={styles.input} value={form.grade} onChangeText={(v) => update('grade', v)} placeholder="e.g. MS-63" />
            </Field>
            <Field label="Grading Company" style={styles.half}>
              <TextInput style={styles.input} value={form.gradingCompany} onChangeText={(v) => update('gradingCompany', v)} placeholder="e.g. PCGS, NGC" />
            </Field>
          </View>
          <Field label="Certificate Number">
            <TextInput style={styles.input} value={form.certificateNumber} onChangeText={(v) => update('certificateNumber', v)} />
          </Field>
          <Field label="Provenance">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.provenance}
              onChangeText={(v) => update('provenance', v)}
              multiline
              numberOfLines={3}
              placeholder="History of prior ownership, sales, or collections, if known"
            />
          </Field>

          <Text variant="mono" style={styles.sectionTitle}>
            Auction Settings
          </Text>
          <View style={styles.row}>
            <Field label="Starting Bid (₹)" style={styles.half}>
              <TextInput
                style={styles.input}
                value={form.startingBid}
                onChangeText={(v) => update('startingBid', v)}
                keyboardType="numeric"
                testID="sell-startingBid"
              />
            </Field>
            <Field label="Bid Increment (₹)" style={styles.half}>
              <TextInput
                style={styles.input}
                value={form.bidIncrement}
                onChangeText={(v) => update('bidIncrement', v)}
                keyboardType="numeric"
                testID="sell-bidIncrement"
              />
            </Field>
          </View>
          <Field label="Start Time">
            <DateTimeField value={form.startTime} onChange={(v) => update('startTime', v)} testID="sell-startTime" />
          </Field>
          <Field label="End Time">
            <DateTimeField value={form.endTime} onChange={(v) => update('endTime', v)} testID="sell-endTime" />
          </Field>

          {error && (
            <Text style={styles.errorText} testID="sell-item-error">
              {error}
            </Text>
          )}

          <Pressable
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            testID="sell-item-submit"
          >
            <Text style={styles.submitButtonText}>
              {submitting ? (isEditing ? 'Resubmitting…' : 'Submitting…') : isEditing ? 'Resubmit for Review' : 'Submit for Review'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
    padding: 24,
    gap: 8,
  },
  notFoundLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.royal,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  intro: {
    fontSize: 13,
    color: colors.gray,
    lineHeight: 19,
    marginBottom: 16,
  },
  successBox: {
    borderWidth: 1,
    borderColor: 'rgba(22,133,91,0.3)',
    backgroundColor: 'rgba(22,133,91,0.08)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    gap: 6,
  },
  successText: {
    fontSize: 13.5,
    color: colors.green,
  },
  successBold: {
    fontWeight: '700',
  },
  successLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.green,
    textDecorationLine: 'underline',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.royal,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 12,
  },
  chipRow: {
    marginBottom: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.royal,
    borderColor: colors.royal,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.charcoal,
  },
  chipTextActive: {
    color: colors.white,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14.5,
    color: colors.charcoal,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  thumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  thumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  removeThumb: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(32,36,42,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeThumbText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  photoButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  photoButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.royal,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  photoButtonText: {
    color: colors.royal,
    fontWeight: '600',
    fontSize: 13.5,
  },
  errorText: {
    fontSize: 13,
    color: colors.red,
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.royal,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
})
