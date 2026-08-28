import { useEffect, useState } from 'react'
import { getSellerReviews, type SellerReviews as SellerReviewsData } from '../lib/api'
import { formatDateTime } from '../lib/format'
import { StarRatingDisplay } from './StarRating'

export function SellerReviews({ sellerId, sellerName }: { sellerId: string; sellerName: string }) {
  const [data, setData] = useState<SellerReviewsData | null>(null)

  useEffect(() => {
    getSellerReviews(sellerId)
      .then(setData)
      .catch(() => {})
  }, [sellerId])

  return (
    <div className="mt-8 border-t border-gray-100 pt-7">
      <h5 className="mb-3.5 font-mono text-[11px] tracking-wider text-gray-500 uppercase">About the Seller</h5>
      <div className="rounded-lg border border-royal/10 p-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-charcoal">{sellerName}</span>
          {data && data.reviewCount > 0 ? (
            <span className="flex items-center gap-1.5">
              <StarRatingDisplay rating={data.averageRating ?? 0} />
              <span className="font-mono text-[12.5px] text-gray-500">
                {data.averageRating?.toFixed(1)} ({data.reviewCount} review{data.reviewCount === 1 ? '' : 's'})
              </span>
            </span>
          ) : (
            <span className="text-[12.5px] text-gray-500">No reviews yet</span>
          )}
        </div>

        {data && data.reviews.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4">
            {data.reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <StarRatingDisplay rating={review.rating} size={12} />
                    <span className="font-semibold text-charcoal">{review.reviewer.name}</span>
                  </span>
                  <span className="font-mono text-[11px] text-gray-500">{formatDateTime(review.createdAt)}</span>
                </div>
                {review.comment && <p className="mt-1 leading-relaxed text-gray-600">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
