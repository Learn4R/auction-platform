import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  applyToSell,
  getCategories,
  getMySellerApplication,
  submitItem,
  type Category,
  type MySellerApplication,
  type SellerApplicationInput,
} from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Sell() {
  const { token } = useAuth()
  const [status, setStatus] = useState<MySellerApplication | null>(null)
  const [error, setError] = useState<string | null>(null)

  function load() {
    if (!token) return
    getMySellerApplication(token)
      .then(setStatus)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [token])

  if (error) return <div className="mx-auto max-w-2xl px-6 py-14 text-sm text-red">{error}</div>
  if (!status) return <div className="mx-auto max-w-2xl px-6 py-14 text-sm text-gray-500">Loading…</div>

  if (status.sellerStatus === 'approved') return <ItemSubmissionForm />

  return <SellerApplicationGate status={status} onSubmitted={load} />
}

const emptyApplication: SellerApplicationInput = {
  fullName: '',
  mobile: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  panNumber: '',
  bankAccountNumber: '',
  bankIFSC: '',
}

function SellerApplicationGate({ status, onSubmitted }: { status: MySellerApplication; onSubmitted: () => void }) {
  const { token } = useAuth()
  const [form, setForm] = useState(emptyApplication)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof SellerApplicationInput>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setError(null)
    setSubmitting(true)
    try {
      await applyToSell(form, token)
      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (status.sellerStatus === 'pending') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-14">
        <h1 className="mb-2 font-display text-3xl text-royal">Application Under Review</h1>
        <div className="rounded-xl border border-gold/40 bg-gold/5 p-6 text-[14px] text-[#8a6e18]">
          Your seller application is under review. We'll notify you as soon as a decision is made — usually within a
          couple of business days.
        </div>
      </div>
    )
  }

  const showReapply = status.sellerStatus === 'rejected'

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="mb-2 font-display text-3xl text-royal">{showReapply ? 'Reapply to Sell' : 'Apply to Sell'}</h1>
      <p className="mb-8 text-sm text-gray-500">
        Selling on Mudra House requires a short verification step. Tell us a bit about yourself and where to send
        payouts, and our team will review your application.
      </p>

      {showReapply && status.application?.rejectionReason && (
        <div className="mb-6 rounded-lg border border-red/30 bg-red/5 p-4 text-sm text-red">
          <b>Your previous application was rejected.</b>
          <p className="mt-1">{status.application.rejectionReason}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Full Name">
          <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className="input" />
        </Field>
        <Field label="Mobile Number">
          <input required value={form.mobile} onChange={(e) => update('mobile', e.target.value)} className="input" />
        </Field>
        <Field label="Address">
          <textarea
            required
            rows={2}
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            className="input"
          />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="City">
            <input required value={form.city} onChange={(e) => update('city', e.target.value)} className="input" />
          </Field>
          <Field label="State">
            <input required value={form.state} onChange={(e) => update('state', e.target.value)} className="input" />
          </Field>
          <Field label="Pincode">
            <input required value={form.pincode} onChange={(e) => update('pincode', e.target.value)} className="input" />
          </Field>
        </div>

        <div className="mt-2 border-t border-gray-100 pt-4">
          <div className="mb-3 font-mono text-[10.5px] font-semibold tracking-wider text-royal uppercase">
            Payout Details
          </div>
          <Field label="PAN Number">
            <input
              required
              value={form.panNumber}
              onChange={(e) => update('panNumber', e.target.value.toUpperCase())}
              className="input"
            />
          </Field>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="Bank Account Number">
              <input
                required
                value={form.bankAccountNumber}
                onChange={(e) => update('bankAccountNumber', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Bank IFSC">
              <input
                required
                value={form.bankIFSC}
                onChange={(e) => update('bankIFSC', e.target.value.toUpperCase())}
                className="input"
              />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-lg bg-royal px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : showReapply ? 'Resubmit Application' : 'Submit Application'}
        </button>
      </form>
    </div>
  )
}

const MAX_IMAGES = 6
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const emptyItemForm = {
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

type ItemForm = typeof emptyItemForm

interface ImagePick {
  file: File
  previewUrl: string
}

const WIZARD_STEPS = [
  { n: 1, label: 'Category' },
  { n: 2, label: 'Item Details' },
  { n: 3, label: 'Upload Images' },
  { n: 4, label: 'Authenticity & Condition' },
  { n: 5, label: 'Auction Settings' },
  { n: 6, label: 'Review & Submit' },
] as const

function validateStep(step: number, form: ItemForm, images: ImagePick[]): string | null {
  if (step === 1) {
    if (!form.categoryId) return 'Please choose a category.'
  }
  if (step === 2) {
    if (!form.title.trim()) return 'Title is required.'
    if (!form.description.trim()) return 'Description is required.'
    if (form.year && !Number.isInteger(Number(form.year))) return 'Year must be a whole number.'
  }
  if (step === 3) {
    if (images.length === 0) return 'Add at least one photo of the item.'
  }
  if (step === 5) {
    if (!form.startingBid || Number(form.startingBid) <= 0) return 'Starting bid must be a positive number.'
    if (!form.bidIncrement || Number(form.bidIncrement) <= 0) return 'Bid increment must be a positive number.'
    if (!form.startTime) return 'Start time is required.'
    if (!form.endTime) return 'End time is required.'
    if (new Date(form.startTime) >= new Date(form.endTime)) return 'Start time must be before end time.'
  }
  return null
}

function ItemSubmissionForm() {
  const { token } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<ItemForm>(emptyItemForm)
  const [images, setImages] = useState<ImagePick[]>([])
  const [imageError, setImageError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [stepError, setStepError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submittedTitle, setSubmittedTitle] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getCategories()
      .then((cats) => {
        setCategories(cats)
        setForm((f) => (f.categoryId ? f : { ...f, categoryId: cats[0]?.id ?? '' }))
      })
      .catch(() => {})
  }, [])

  // Revoke object URLs on unmount to avoid leaking memory.
  useEffect(() => {
    return () => {
      for (const img of images) URL.revokeObjectURL(img.previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update<K extends keyof ItemForm>(key: K, value: ItemForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    setImageError(null)

    if (images.length + picked.length > MAX_IMAGES) {
      setImageError(`You can upload up to ${MAX_IMAGES} images (${images.length} already selected).`)
      return
    }

    const tooBig = picked.find((f) => f.size > MAX_IMAGE_BYTES)
    if (tooBig) {
      setImageError(`"${tooBig.name}" is larger than 5MB.`)
      return
    }

    const notImage = picked.find((f) => !f.type.startsWith('image/'))
    if (notImage) {
      setImageError(`"${notImage.name}" isn't an image file.`)
      return
    }

    setImages((prev) => [...prev, ...picked.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))])
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  function goNext() {
    const message = validateStep(step, form, images)
    if (message) {
      setStepError(message)
      return
    }
    setStepError(null)
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length))
  }

  function goBack() {
    setStepError(null)
    setStep((s) => Math.max(s - 1, 1))
  }

  async function handleSubmit() {
    if (!token) return
    setError(null)
    setSubmitting(true)
    try {
      const item = await submitItem(
        {
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
          images: images.map((i) => i.file),
          startingBid: Number(form.startingBid),
          bidIncrement: Number(form.bidIncrement),
          startTime: new Date(form.startTime).toISOString(),
          endTime: new Date(form.endTime).toISOString(),
        },
        token,
      )
      setSubmittedTitle(item.title)
      setForm({ ...emptyItemForm, categoryId: categories[0]?.id ?? '' })
      for (const img of images) URL.revokeObjectURL(img.previewUrl)
      setImages([])
      setImageError(null)
      setStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCategory = categories.find((c) => c.id === form.categoryId)

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="mb-2 font-display text-3xl text-royal">Sell an Item</h1>
      <p className="mb-8 text-sm text-gray-500">
        Submit a lot for review. Once approved by our team, it goes live for bidding with the auction settings you
        propose below.
      </p>

      {submittedTitle && (
        <div className="mb-6 rounded-lg border border-green/30 bg-green/10 p-4 text-sm text-green">
          <b>{submittedTitle}</b> was submitted and is now pending review.{' '}
          <Link to="/my-listings" className="font-semibold underline">
            View my dashboard →
          </Link>
        </div>
      )}

      <WizardProgress step={step} />

      <div className="flex flex-col gap-4">
        {step === 1 && (
          <Field label="Category">
            <select value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)} className="input">
              <option value="">Select a category…</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {step === 2 && (
          <>
            <Field label="Title">
              <input value={form.title} onChange={(e) => update('title', e.target.value)} className="input" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Year">
                <input type="number" value={form.year} onChange={(e) => update('year', e.target.value)} className="input" />
              </Field>
              <Field label="Denomination">
                <input value={form.denomination} onChange={(e) => update('denomination', e.target.value)} className="input" placeholder="e.g. One Rupee" />
              </Field>
              <Field label="Mint">
                <input value={form.mint} onChange={(e) => update('mint', e.target.value)} className="input" placeholder="e.g. Calcutta" />
              </Field>
              <Field label="Ruler / Authority">
                <input value={form.rulerAuthority} onChange={(e) => update('rulerAuthority', e.target.value)} className="input" placeholder="e.g. George V" />
              </Field>
              <Field label="Period">
                <input value={form.period} onChange={(e) => update('period', e.target.value)} className="input" placeholder="e.g. British India" />
              </Field>
              <Field label="Material">
                <input value={form.material} onChange={(e) => update('material', e.target.value)} className="input" />
              </Field>
              <Field label="Weight">
                <input value={form.weight} onChange={(e) => update('weight', e.target.value)} className="input" placeholder="e.g. 11.66 g" />
              </Field>
              <Field label="Diameter">
                <input value={form.diameter} onChange={(e) => update('diameter', e.target.value)} className="input" placeholder="e.g. 30.5 mm" />
              </Field>
            </div>
            <Field label="Description">
              <textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} className="input" />
            </Field>
          </>
        )}

        {step === 3 && (
          <Field label={`Photos (up to ${MAX_IMAGES}, 5MB each)`}>
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={img.previewUrl} className="group relative h-20 w-20 flex-none overflow-hidden rounded-lg border border-royal/15">
                  <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal/70 text-[11px] font-bold text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 flex-none flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-royal/25 text-gray-400 transition hover:border-royal/50 hover:text-royal"
                >
                  <span className="text-xl leading-none">+</span>
                  <span className="text-[10px] font-semibold">Add</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
            {imageError && <span className="text-[11.5px] font-normal text-red">{imageError}</span>}
          </Field>
        )}

        {step === 4 && (
          <>
            <Field label="Condition">
              <input value={form.condition} onChange={(e) => update('condition', e.target.value)} className="input" placeholder="e.g. Extremely Fine" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Grade">
                <input value={form.grade} onChange={(e) => update('grade', e.target.value)} className="input" placeholder="e.g. MS-63" />
              </Field>
              <Field label="Grading Company">
                <input value={form.gradingCompany} onChange={(e) => update('gradingCompany', e.target.value)} className="input" placeholder="e.g. PCGS, NGC" />
              </Field>
              <Field label="Certificate Number">
                <input value={form.certificateNumber} onChange={(e) => update('certificateNumber', e.target.value)} className="input" />
              </Field>
            </div>
            <Field label="Provenance">
              <textarea
                rows={3}
                value={form.provenance}
                onChange={(e) => update('provenance', e.target.value)}
                className="input"
                placeholder="History of prior ownership, sales, or collections, if known"
              />
            </Field>
          </>
        )}

        {step === 5 && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Starting Bid (₹)">
              <input type="number" min="1" value={form.startingBid} onChange={(e) => update('startingBid', e.target.value)} className="input" />
            </Field>
            <Field label="Bid Increment (₹)">
              <input type="number" min="1" value={form.bidIncrement} onChange={(e) => update('bidIncrement', e.target.value)} className="input" />
            </Field>
            <Field label="Start Time">
              <input type="datetime-local" value={form.startTime} onChange={(e) => update('startTime', e.target.value)} className="input" />
            </Field>
            <Field label="End Time">
              <input type="datetime-local" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} className="input" />
            </Field>
          </div>
        )}

        {step === 6 && (
          <ReviewStep form={form} images={images} categoryName={selectedCategory?.name ?? '—'} />
        )}

        {stepError && <p className="text-sm text-red">{stepError}</p>}
        {error && <p className="text-sm text-red">{error}</p>}

        <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className="rounded-lg border border-royal/20 px-5 py-2.5 text-[14px] font-semibold text-charcoal transition hover:bg-gray-50 disabled:opacity-0"
          >
            ← Back
          </button>

          {step < WIZARD_STEPS.length ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg bg-royal px-6 py-2.5 text-[14px] font-semibold text-white transition hover:bg-deepblue"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-royal px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function WizardProgress({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold tracking-wider text-royal uppercase">
          Step {step} of {WIZARD_STEPS.length}
        </span>
        <span className="text-[13px] font-semibold text-charcoal">{WIZARD_STEPS[step - 1].label}</span>
      </div>
      <div className="flex gap-1.5">
        {WIZARD_STEPS.map((s) => (
          <div
            key={s.n}
            className={`h-1.5 flex-1 rounded-full transition ${s.n <= step ? 'bg-royal' : 'bg-gray-200'}`}
          />
        ))}
      </div>
    </div>
  )
}

function ReviewStep({ form, images, categoryName }: { form: ItemForm; images: ImagePick[]; categoryName: string }) {
  const rows: [string, string][] = [
    ['Category', categoryName],
    ['Title', form.title || '—'],
    ['Year', form.year || '—'],
    ['Denomination', form.denomination || '—'],
    ['Mint', form.mint || '—'],
    ['Ruler / Authority', form.rulerAuthority || '—'],
    ['Period', form.period || '—'],
    ['Material', form.material || '—'],
    ['Weight', form.weight || '—'],
    ['Diameter', form.diameter || '—'],
    ['Description', form.description || '—'],
    ['Condition', form.condition || '—'],
    ['Grade', form.grade || '—'],
    ['Grading Company', form.gradingCompany || '—'],
    ['Certificate Number', form.certificateNumber || '—'],
    ['Provenance', form.provenance || '—'],
    ['Starting Bid', form.startingBid ? `₹${form.startingBid}` : '—'],
    ['Bid Increment', form.bidIncrement ? `₹${form.bidIncrement}` : '—'],
    ['Start Time', form.startTime || '—'],
    ['End Time', form.endTime || '—'],
  ]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 font-mono text-[10.5px] font-semibold tracking-wider text-royal uppercase">
          Photos ({images.length})
        </div>
        {images.length === 0 ? (
          <p className="text-[13px] text-gray-500">No photos added.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {images.map((img) => (
              <div key={img.previewUrl} className="h-16 w-16 flex-none overflow-hidden rounded-lg border border-royal/15">
                <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-royal/10">
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className={`flex items-start justify-between gap-4 px-4 py-2.5 text-[13px] ${i % 2 === 0 ? 'bg-gray-50/60' : ''}`}
          >
            <span className="flex-none text-gray-500">{label}</span>
            <span className="text-right font-medium text-charcoal">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-charcoal">
      {label}
      {children}
    </label>
  )
}
