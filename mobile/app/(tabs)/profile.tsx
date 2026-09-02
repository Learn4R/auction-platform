import { useCallback, useState } from 'react'
import { Link, router, useFocusEffect } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors } from '../../constants/colors'
import { getMyProfile, getMySellerApplication, type MyProfile, type MySellerApplication } from '../../lib/api'
import { useAuth } from '../../lib/auth'

// Real account info (name/email/role from GET /api/auth/me, since the JWT
// itself doesn't carry email) plus the real seller-application status,
// deciding which single action to show exactly the way the web app's
// Sell.tsx / MyListings.tsx StatusBanner does: none → Apply to Sell,
// pending → under-review message only, rejected → reason + Reapply,
// approved → Sell an Item + My Listings.
export default function Profile() {
  const { user, token, logout } = useAuth()
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [sellerInfo, setSellerInfo] = useState<MySellerApplication | null>(null)
  const [error, setError] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      if (!token) return
      Promise.all([getMyProfile(token), getMySellerApplication(token)])
        .then(([p, s]) => {
          setProfile(p)
          setSellerInfo(s)
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profile'))
    }, [token]),
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="profile-screen">
      <View style={styles.header}>
        <Text style={styles.greeting} testID="profile-greeting">
          Logged in as {user?.name}
        </Text>
        {profile ? (
          <Text style={styles.email} testID="profile-email">
            {profile.email}
          </Text>
        ) : (
          <ActivityIndicator color={colors.royal} style={styles.emailLoader} testID="profile-loading" />
        )}
        <Text style={styles.role}>{user?.role}</Text>
      </View>

      {error && (
        <Text style={styles.error} testID="profile-error">
          {error}
        </Text>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Selling</Text>
        {sellerInfo ? (
          <SellerStatusCard
            status={sellerInfo.sellerStatus}
            rejectionReason={sellerInfo.application?.rejectionReason ?? null}
          />
        ) : (
          <ActivityIndicator color={colors.royal} testID="seller-status-loading" />
        )}
      </View>

      <Pressable style={styles.logoutButton} onPress={logout} testID="profile-logout">
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </Pressable>
    </ScrollView>
  )
}

function SellerStatusCard({
  status,
  rejectionReason,
}: {
  status: MySellerApplication['sellerStatus']
  rejectionReason: string | null
}) {
  if (status === 'approved') {
    return (
      <View style={styles.card} testID="seller-status-approved">
        <Text style={styles.cardText}>You&apos;re an approved seller.</Text>
        <View style={styles.cardButtonRow}>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/sell-item')} testID="sell-an-item-button">
            <Text style={styles.primaryButtonText}>Sell an Item</Text>
          </Pressable>
          <Link href="/my-listings" style={styles.secondaryLink} testID="my-listings-link">
            My Listings →
          </Link>
        </View>
      </View>
    )
  }

  if (status === 'pending') {
    return (
      <View style={[styles.card, styles.cardPending]} testID="seller-status-pending">
        <Text style={styles.cardTextPending}>
          Your seller application is under review. We&apos;ll let you know as soon as a decision is made.
        </Text>
      </View>
    )
  }

  if (status === 'rejected') {
    return (
      <View style={[styles.card, styles.cardRejected]} testID="seller-status-rejected">
        <Text style={styles.cardTextRejected}>Your seller application was rejected.</Text>
        {rejectionReason && <Text style={styles.cardReasonRejected}>{rejectionReason}</Text>}
        <Pressable
          style={[styles.primaryButton, styles.reapplyButton]}
          onPress={() => router.push('/apply-to-sell')}
          testID="reapply-to-sell-button"
        >
          <Text style={styles.primaryButtonText}>Reapply to Sell</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.card} testID="seller-status-none">
      <Text style={styles.cardText}>You haven&apos;t applied to sell yet. Apply to start listing items for auction.</Text>
      <Pressable
        style={[styles.primaryButton, styles.applyButton]}
        onPress={() => router.push('/apply-to-sell')}
        testID="apply-to-sell-button"
      >
        <Text style={styles.primaryButtonText}>Apply to Sell</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 28,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.royal,
    textAlign: 'center',
  },
  email: {
    fontSize: 13,
    color: colors.gray,
  },
  emailLoader: {
    marginVertical: 4,
  },
  role: {
    fontSize: 12,
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.gray,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardPending: {
    borderColor: 'rgba(201,162,39,0.4)',
    backgroundColor: 'rgba(201,162,39,0.06)',
  },
  cardRejected: {
    borderColor: 'rgba(200,59,59,0.3)',
    backgroundColor: 'rgba(200,59,59,0.05)',
  },
  cardText: {
    fontSize: 13.5,
    color: colors.charcoal,
    lineHeight: 19,
  },
  cardTextPending: {
    fontSize: 13.5,
    color: '#8a6e18',
    lineHeight: 19,
  },
  cardTextRejected: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.red,
  },
  cardReasonRejected: {
    fontSize: 13,
    color: colors.red,
    lineHeight: 18,
  },
  cardButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: colors.royal,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  applyButton: {},
  reapplyButton: {},
  primaryButtonText: {
    color: colors.white,
    fontSize: 13.5,
    fontWeight: '600',
  },
  secondaryLink: {
    color: colors.royal,
    fontWeight: '600',
    fontSize: 13.5,
  },
  logoutButton: {
    backgroundColor: colors.royal,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    fontSize: 13,
    color: colors.red,
    textAlign: 'center',
    marginBottom: 16,
  },
})
