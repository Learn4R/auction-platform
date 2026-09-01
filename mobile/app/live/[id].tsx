import { router, Link, Stack, useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { CategoryThumb } from '../../components/CategoryThumb'
import { colors } from '../../constants/colors'
import { formatCountdownPrecise, formatCurrency, formatDateTime } from '../../lib/format'
import { useItemAuction } from '../../lib/useItemAuction'

// The dedicated live-bidding room — separate from the read-only Item
// Detail screen, exactly like the web app splits ItemDetail from
// LiveAuction. All the data/socket/bid logic lives in useItemAuction,
// shared with the web client's equivalent hook one-for-one.
export default function LiveAuctionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const state = useItemAuction(id)
  const {
    user,
    item,
    auction,
    error,
    watcherCount,
    price,
    nextMin,
    isWinning,
    isOutbid,
    notice,
    justExtended,
    bidInput,
    setBidInput,
    confirming,
    setConfirming,
    bidError,
    setBidError,
    bidBusy,
    handleConfirmBid,
    showMaxBid,
    setShowMaxBid,
    maxBidInput,
    setMaxBidInput,
    maxBidError,
    maxBidBusy,
    maxBidSaved,
    handleSetMaxBid,
  } = state

  // If this screen is somehow reached for a non-live auction (e.g. it ended
  // before the data even finished loading the first time), send the user to
  // the plain Item Detail screen instead of showing a bidding UI for nothing.
  useEffect(() => {
    if (auction && auction.status === 'upcoming' && id) {
      router.replace(`/items/${id}`)
    }
  }, [auction, id])

  if (error) {
    return (
      <View style={styles.center} testID="live-error">
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  }

  if (!item || !auction) {
    return (
      <View style={styles.center} testID="live-loading">
        <ActivityIndicator color={colors.gold} />
      </View>
    )
  }

  if (auction.status === 'ended') {
    const sold = !!auction.winner
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: item.title }} />
        <View style={styles.center} testID="live-ended">
          <CategoryThumb categoryName={item.category.name} size={96} />
          <Text style={styles.endedTitle}>{item.title}</Text>
          <Text style={styles.endedLabel}>{sold ? 'Hammer Price' : 'Auction Ended'}</Text>
          <Text style={styles.endedPrice} testID="live-hammer-price">
            {sold ? formatCurrency(auction.currentBid ?? auction.startingBid) : 'Unsold'}
          </Text>
          {sold && (
            <Text style={styles.endedWinner} testID="live-winner">
              Won by {auction.winner!.id === user?.id ? 'you' : auction.winner!.name}
            </Text>
          )}
          <Pressable style={styles.doneButton} onPress={() => router.replace(`/items/${id}`)}>
            <Text style={styles.doneButtonText}>View Lot Details</Text>
          </Pressable>
        </View>
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: item.title, headerStyle: { backgroundColor: colors.royal } }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} testID="live-screen">
          <View style={styles.liveBadgeRow}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE NOW</Text>
            </View>
          </View>

          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.category.name} · Listed by {item.seller.name}
          </Text>

          {notice && (
            <View style={[styles.banner, styles.noticeBanner, justExtended && styles.noticePulse]} testID="live-extended-banner">
              <Text style={styles.noticeText}>⏱ {notice}</Text>
            </View>
          )}
          {isWinning && (
            <View style={[styles.banner, styles.winningBanner]} testID="live-winning-banner">
              <Text style={styles.winningText}>You are currently winning this lot</Text>
            </View>
          )}
          {isOutbid && (
            <View style={[styles.banner, styles.outbidBanner]} testID="live-outbid-banner">
              <Text style={styles.outbidText}>You have been outbid — place a new bid to retake the lead</Text>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Current Bid</Text>
              <Text style={styles.statValueGold} testID="live-current-bid">
                {formatCurrency(price!)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Time Left</Text>
              <Text style={styles.statValue} testID="live-time-left">
                {formatCountdownPrecise(auction.endTime)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Active Bidders</Text>
              <Text style={styles.statValue} testID="live-watcher-count">
                {watcherCount ?? '—'}
              </Text>
            </View>
          </View>

          <Text style={styles.minNext}>
            Minimum next bid: <Text style={styles.minNextAmount}>{formatCurrency(nextMin ?? 0)}</Text>
          </Text>

          {!user ? (
            <Link href="/login" style={styles.loginLink} testID="live-login-link">
              Log In to Bid
            </Link>
          ) : !confirming ? (
            <>
              <View style={styles.bidRow}>
                <TextInput
                  style={styles.bidInput}
                  keyboardType="numeric"
                  placeholder={String(nextMin ?? '')}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={bidInput}
                  onChangeText={setBidInput}
                  testID="live-bid-input"
                />
                <Pressable
                  style={styles.bidButton}
                  testID="live-bid-submit"
                  onPress={() => {
                    setBidError(null)
                    if (!bidInput || Number(bidInput) < (nextMin ?? 0)) {
                      setBidError(`Enter at least ${formatCurrency(nextMin ?? 0)}`)
                      return
                    }
                    setConfirming(true)
                  }}
                >
                  <Text style={styles.bidButtonText}>Place Bid</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => setShowMaxBid((v) => !v)}>
                <Text style={styles.maxBidToggle} testID="live-maxbid-toggle">
                  {showMaxBid ? 'Hide maximum bid' : 'Set a maximum bid →'}
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.confirmBox} testID="live-confirm-box">
              <Text style={styles.confirmLabel}>Confirm your bid of</Text>
              <Text style={styles.confirmAmount}>{formatCurrency(bidInput)}</Text>
              <View style={styles.confirmRow}>
                <Pressable
                  style={[styles.confirmButton, bidBusy && styles.buttonDisabled]}
                  onPress={handleConfirmBid}
                  disabled={bidBusy}
                  testID="live-confirm-bid"
                >
                  <Text style={styles.confirmButtonText}>{bidBusy ? 'Placing…' : 'Confirm Bid'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.cancelButton, bidBusy && styles.buttonDisabled]}
                  onPress={() => setConfirming(false)}
                  disabled={bidBusy}
                  testID="live-cancel-bid"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}

          {bidError && (
            <Text style={styles.bidErrorText} testID="live-bid-error">
              {bidError}
            </Text>
          )}

          {user && showMaxBid && !confirming && (
            <View style={styles.maxBidBox}>
              <Text style={styles.maxBidHint}>
                We&apos;ll automatically bid the minimum needed to keep you winning, up to this amount. Other bidders
                never see it.
              </Text>
              <View style={styles.bidRow}>
                <TextInput
                  style={styles.maxBidInput}
                  keyboardType="numeric"
                  placeholder="Your maximum"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={maxBidInput}
                  onChangeText={setMaxBidInput}
                  testID="live-maxbid-input"
                />
                <Pressable
                  style={[styles.maxBidButton, (maxBidBusy || !maxBidInput) && styles.buttonDisabled]}
                  onPress={handleSetMaxBid}
                  disabled={maxBidBusy || !maxBidInput}
                  testID="live-maxbid-submit"
                >
                  <Text style={styles.maxBidButtonText}>{maxBidBusy ? 'Saving…' : 'Set Max'}</Text>
                </Pressable>
              </View>
              {maxBidError && (
                <Text style={styles.maxBidErrorText} testID="live-maxbid-error">
                  {maxBidError}
                </Text>
              )}
              {maxBidSaved && (
                <Text style={styles.maxBidSavedText} testID="live-maxbid-saved">
                  {maxBidSaved}
                </Text>
              )}
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaSmall}>Started {formatDateTime(auction.startTime)}</Text>
            <Text style={styles.metaSmall}>Increment {formatCurrency(auction.bidIncrement)}</Text>
          </View>

          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Live Bid History</Text>
            {auction.bids.length === 0 ? (
              <Text style={styles.historyEmpty}>No bids placed yet. Be the first.</Text>
            ) : (
              <View style={styles.historyList} testID="live-bid-history">
                {auction.bids.map((bid, i) => (
                  <View key={bid.id} style={[styles.historyRow, i === 0 && styles.historyRowLeader]}>
                    <View style={styles.historyBidder}>
                      <Text style={styles.historyName}>{bid.user.name}</Text>
                      {bid.isProxy && (
                        <View style={styles.autoTag}>
                          <Text style={styles.autoTagText}>AUTO</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.historyAmount}>{formatCurrency(bid.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.royal,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
    padding: 24,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.red,
    textAlign: 'center',
  },
  liveBadgeRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(200, 59, 59, 0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  liveBadgeText: {
    color: colors.red,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
  },
  banner: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  noticeBanner: {
    borderColor: 'rgba(201,162,39,0.5)',
    backgroundColor: 'rgba(201,162,39,0.15)',
  },
  noticePulse: {
    borderColor: colors.gold,
  },
  noticeText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  winningBanner: {
    borderColor: 'rgba(34,164,90,0.4)',
    backgroundColor: 'rgba(34,164,90,0.15)',
  },
  winningText: {
    color: '#3FC172',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  outbidBanner: {
    borderColor: 'rgba(200,59,59,0.4)',
    backgroundColor: 'rgba(200,59,59,0.15)',
  },
  outbidText: {
    color: '#F08585',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statValueGold: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.gold,
  },
  statValue: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.white,
  },
  minNext: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 12,
  },
  minNextAmount: {
    color: colors.gold,
    fontWeight: '700',
  },
  loginLink: {
    backgroundColor: colors.gold,
    color: colors.royal,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
    borderRadius: 10,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  bidRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bidInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    fontWeight: '600',
    color: colors.white,
  },
  bidButton: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  bidButtonText: {
    color: colors.royal,
    fontWeight: '700',
    fontSize: 15,
  },
  maxBidToggle: {
    marginTop: 10,
    textAlign: 'center',
    color: 'rgba(201,162,39,0.9)',
    fontWeight: '600',
    fontSize: 12.5,
  },
  confirmBox: {
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.4)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 18,
  },
  confirmLabel: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12.5,
    marginBottom: 4,
  },
  confirmAmount: {
    textAlign: 'center',
    color: colors.gold,
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 16,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: colors.royal,
    fontWeight: '700',
    fontSize: 14,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  bidErrorText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#F08585',
    fontSize: 12.5,
  },
  maxBidBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 14,
  },
  maxBidHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 10,
  },
  maxBidInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  maxBidButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  maxBidButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  maxBidErrorText: {
    marginTop: 8,
    color: '#F08585',
    fontSize: 12,
  },
  maxBidSavedText: {
    marginTop: 8,
    color: '#3FC172',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  metaSmall: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  historySection: {
    marginTop: 28,
  },
  historyTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  historyEmpty: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  historyList: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  historyRowLeader: {
    backgroundColor: 'rgba(201,162,39,0.1)',
  },
  historyBidder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyName: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  autoTag: {
    backgroundColor: 'rgba(201,162,39,0.2)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  autoTagText: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: '700',
  },
  historyAmount: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
  },
  endedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.royal,
    textAlign: 'center',
    marginTop: 16,
  },
  endedLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.gray,
    textTransform: 'uppercase',
    marginTop: 20,
  },
  endedPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.royal,
    marginTop: 4,
  },
  endedWinner: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 8,
  },
  doneButton: {
    marginTop: 28,
    backgroundColor: colors.royal,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  doneButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
})
