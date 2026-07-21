'use client';

/**
 * RELOO Global Store
 * React Context + useReducer với localStorage persistence
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import { STORAGE_KEY, FEE_RATES, LISTING_STATUS, CATEGORIES } from './constants';
import {
  calcTrustScore,
  calcOrderTotal,
  generateId,
  generateOrderId,
  generateNftId,
  generateMockHash,
} from './utils';
import { createSeedState } from './seed-data';
import {
  applyBankAccountTransaction,
  upsertCustomerProfile,
  seedCustomersFromUsers,
  buildCustomerFromUser,
  createAuditLog,
  CUSTOMER_AUDIT_ACTIONS,
} from './customer/store-helpers';
import { rankCategories } from './utils';
import {
  appendChronicle,
  appendReplayEvent,
  evaluateRentalDecision,
  buildRentalContext,
  mergeIdentityProfiles,
  buildIdentityProfileFromUser,
  mergeIdentityChecks,
  appendBehaviorLog,
  DECISION_OUTCOME,
} from './trust-platform';
import { isSupabaseConfigured } from './supabase/env';

// ─── Action Types ────────────────────────────────────────────────────────────

export const ActionTypes = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  SWITCH_USER: 'SWITCH_USER',
  HYDRATE: 'HYDRATE',
  CREATE_LISTING: 'CREATE_LISTING',
  UPDATE_LISTING: 'UPDATE_LISTING',
  BOOST_LISTING: 'BOOST_LISTING',
  CREATE_ORDER: 'CREATE_ORDER',
  UPDATE_ORDER_STATUS: 'UPDATE_ORDER_STATUS',
  UPDATE_ORDER_SHIPPING: 'UPDATE_ORDER_SHIPPING',
  COMPLETE_AUDIT: 'COMPLETE_AUDIT',
  UPDATE_KYC: 'UPDATE_KYC',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  ADD_TICKET: 'ADD_TICKET',
  UPDATE_TICKET: 'UPDATE_TICKET',
  UPDATE_CMS: 'UPDATE_CMS',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  MARK_NOTIFICATION_READ: 'MARK_NOTIFICATION_READ',
  MARK_ALL_NOTIFICATIONS_READ: 'MARK_ALL_NOTIFICATIONS_READ',
  WITHDRAW_WALLET: 'WITHDRAW_WALLET',
  PURCHASE_ADS: 'PURCHASE_ADS',
  RESOLVE_RISK: 'RESOLVE_RISK',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  UPDATE_LEAD: 'UPDATE_LEAD',
  ADD_LEAD: 'ADD_LEAD',
  UPDATE_RISK_ALERT: 'UPDATE_RISK_ALERT',
  REGISTER_USER: 'REGISTER_USER',
  SET_GUEST_LOCATION: 'SET_GUEST_LOCATION',
  ENSURE_INQUIRY_THREAD: 'ENSURE_INQUIRY_THREAD',
  ENSURE_ORDER_THREAD: 'ENSURE_ORDER_THREAD',
  SEND_CHAT_MESSAGE: 'SEND_CHAT_MESSAGE',
  RECEIVE_CHAT_MESSAGE: 'RECEIVE_CHAT_MESSAGE',
  MARK_MESSAGES_READ_BY: 'MARK_MESSAGES_READ_BY',
  LOG_BEHAVIOR: 'LOG_BEHAVIOR',
  CAPTURE_REPLAY: 'CAPTURE_REPLAY',
  SAVE_BANK_ACCOUNT: 'SAVE_BANK_ACCOUNT',
  SYNC_FROM_DB: 'SYNC_FROM_DB',
  CREATE_RENT_WAITLIST: 'CREATE_RENT_WAITLIST',
  CANCEL_RENT_WAITLIST: 'CANCEL_RENT_WAITLIST',
};

// ─── Initial State ───────────────────────────────────────────────────────────

function getInitialState() {
  return createSeedState();
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function relooReducer(state, action) {
  switch (action.type) {
    case ActionTypes.HYDRATE:
      return {
        ...state,
        ...action.payload,
        categories: CATEGORIES,
        chatThreads: action.payload.chatThreads ?? state.chatThreads ?? [],
        chronicle: action.payload.chronicle ?? state.chronicle ?? [],
        behaviorLogs: action.payload.behaviorLogs ?? state.behaviorLogs ?? [],
        decisionLogs: action.payload.decisionLogs ?? state.decisionLogs ?? [],
        rentWaitlists: action.payload.rentWaitlists ?? state.rentWaitlists ?? [],
        identityProfiles: mergeIdentityProfiles(
          action.payload.identityProfiles ?? state.identityProfiles,
          action.payload.users ?? state.users
        ),
        sessionReplays: action.payload.sessionReplays ?? state.sessionReplays ?? {},
        featureStore: action.payload.featureStore ?? state.featureStore ?? {},
        customers:
          action.payload.customers?.length > 0
            ? action.payload.customers
            : seedCustomersFromUsers(action.payload.users ?? state.users),
        customerBankAccounts: action.payload.customerBankAccounts ?? state.customerBankAccounts ?? [],
        customerAuditLogs: action.payload.customerAuditLogs ?? state.customerAuditLogs ?? [],
      };

    case ActionTypes.SYNC_FROM_DB: {
      const { listings, users, orders, settings } = action.payload;
      const mergedUsers = users ?? state.users;
      const nextUser = state.user
        ? mergedUsers.find((u) => u.id === state.user.id) ?? state.user
        : state.user;

      return {
        ...state,
        listings: listings ?? state.listings,
        users: mergedUsers,
        orders: orders ?? state.orders,
        settings: settings ? { ...state.settings, ...settings } : state.settings,
        user: nextUser,
        dbSynced: true,
      };
    }

    case ActionTypes.LOGIN: {
      const user = state.users.find((u) => u.id === action.payload.userId);
      if (!user) return state;
      return { ...state, user };
    }

    case ActionTypes.LOGOUT:
      return { ...state, user: null };

    case ActionTypes.SWITCH_USER: {
      const user = state.users.find((u) => u.id === action.payload.userId);
      if (!user) return state;
      return { ...state, user };
    }

    case ActionTypes.REGISTER_USER: {
      const { profile } = action.payload;
      const id = generateId('user');
      const newUser = {
        id,
        email: profile.email,
        phone: profile.phone,
        name: profile.name,
        avatar: profile.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name)}`,
        role: profile.role || 'both',
        kycLevel: 'L1',
        historyScore: 0,
        feedbackScore: 0,
        defaultsScore: 0,
        address: profile.address || '',
        bankAccount: null,
        walletBalance: 0,
        totalEarnings: 0,
        totalRentals: 0,
        joinedAt: new Date().toISOString(),
        isPro: false,
        pushUpCredits: 3,
        bio: profile.bio || '',
      };
      newUser.trustScore = calcTrustScore(newUser);
      const newProfile = buildIdentityProfileFromUser(newUser);
      const newCustomer = buildCustomerFromUser(newUser);
      const customerAuditLogs = [
        createAuditLog({
          customerId: newCustomer.customerId,
          action: CUSTOMER_AUDIT_ACTIONS.CUSTOMER_CREATED,
          actorId: id,
        }),
        ...(state.customerAuditLogs ?? []),
      ];
      return {
        ...state,
        users: [...state.users, newUser],
        user: newUser,
        identityProfiles: [...(state.identityProfiles ?? []), newProfile],
        customers: [...(state.customers ?? []), newCustomer],
        customerAuditLogs,
      };
    }

    case ActionTypes.CREATE_LISTING: {
      const { listing } = action.payload;
      const nftId = generateNftId();
      const newListing = {
        id: generateId('listing'),
        status: LISTING_STATUS.AVAILABLE.code,
        rating: 0,
        reviewCount: 0,
        viewCount: 0,
        isBoosted: false,
        labels: [],
        trustBadges: ['verified'],
        createdAt: new Date().toISOString(),
        nftPassport: {
          id: nftId,
          hash: generateMockHash(listing.title),
          residualValue: listing.marketValue,
          auditCount: 0,
          mintedAt: new Date().toISOString(),
        },
        ...listing,
      };
      return {
        ...state,
        listings: [newListing, ...state.listings],
      };
    }

    case ActionTypes.UPDATE_LISTING: {
      const { listingId, updates } = action.payload;
      return {
        ...state,
        listings: state.listings.map((l) =>
          l.id === listingId ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
        ),
      };
    }

    case ActionTypes.BOOST_LISTING: {
      const { listingId, labels = ['Tin ưu tiên'], durationDays = 3 } = action.payload;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + durationDays);
      return {
        ...state,
        listings: state.listings.map((l) =>
          l.id === listingId
            ? {
                ...l,
                isBoosted: true,
                labels: [...new Set([...(l.labels || []), ...labels])],
                boostExpiry: expiry.toISOString(),
              }
            : l
        ),
      };
    }

    case ActionTypes.CREATE_ORDER: {
      const {
        listingId,
        renterId,
        days,
        relooCarePlan = 'basic',
        shippingFee = 35000,
        shippingRateId = null,
        shippingCarrier = null,
        shippingProvider = null,
        pickupAddress = null,
        deliveryAddress = null,
        cccdHandoverRequired = true,
        deliveryMode = 'shipper',
        rentalStartRule = null,
        estimatedTransitDays = null,
        estimatedShipByDate = null,
        estimatedRentalStartDate = null,
      } = action.payload;

      const listing = state.listings.find((l) => l.id === listingId);
      const renter = state.users.find((u) => u.id === renterId);
      if (!listing || !renter) return state;

      const ctx = buildRentalContext(state, action.payload);
      const decision = evaluateRentalDecision(ctx);

      let chronicle = state.chronicle ?? [];
      for (const entry of decision.chronicleEntries ?? []) {
        chronicle = appendChronicle(chronicle, entry);
      }
      const decisionLogs = [...(state.decisionLogs ?? []), decision];

      const blocked =
        decision.outcome === DECISION_OUTCOME.REJECT ||
        decision.outcome === DECISION_OUTCOME.NEED_MORE_VERIFICATION;

      if (blocked) {
        return {
          ...state,
          chronicle,
          decisionLogs,
          lastRentalDecision: decision,
        };
      }

      const trustScore = decision.scores?.trust ?? renter.trustScore ?? calcTrustScore(renter);
      const lender = state.users.find((u) => u.id === listing.ownerId);
      const pricing = calcOrderTotal({
        dailyPrice: listing.dailyPrice,
        days,
        marketValue: listing.marketValue,
        trustScore,
        relooCarePlan,
        shippingFee,
        lenderUser: lender,
      });

      const finalDeposit = decision.deposit?.final ?? pricing.deposit;
      const depositDelta = finalDeposit - pricing.deposit;
      const grandTotal = pricing.grandTotal + depositDelta;

      const order = {
        id: generateOrderId(),
        listingId,
        renterId,
        lenderId: listing.ownerId,
        status: 'pending',
        days,
        dailyPrice: listing.dailyPrice,
        rentalTotal: pricing.total,
        platformFee: pricing.platformFee,
        relooCareFee: pricing.relooCareFee,
        relooCarePlan,
        deposit: finalDeposit,
        shippingFee: pricing.shippingFee,
        grandTotal,
        decisionId: decision.decisionId,
        trustScoreSnapshot: decision.scores?.trust,
        riskScoreSnapshot: decision.scores?.risk,
        fraudScoreSnapshot: decision.scores?.fraud,
        decisionOutcome: decision.outcome,
        startDate: action.payload.startDate ?? null,
        endDate: action.payload.endDate ?? null,
        trackingNumber: null,
        shippingProvider: shippingProvider ?? shippingCarrier ?? null,
        shippingRateId: shippingRateId ?? null,
        shippingCarrier: shippingCarrier ?? null,
        pickupAddress: pickupAddress ?? null,
        deliveryAddress: deliveryAddress ?? null,
        cccdHandoverRequired: cccdHandoverRequired !== false,
        deliveryMode: deliveryMode ?? 'shipper',
        rentalStartRule: rentalStartRule ?? 'on_receive',
        estimatedTransitDays: estimatedTransitDays ?? null,
        estimatedShipByDate: estimatedShipByDate ?? null,
        estimatedRentalStartDate: estimatedRentalStartDate ?? action.payload.startDate ?? null,
        rentalStartAt: null,
        auditPickupHash: null,
        auditReturnHash: null,
        createdAt: new Date().toISOString(),
        paidAt: null,
        notes: action.payload.notes ?? '',
      };

      return {
        ...state,
        chronicle,
        decisionLogs,
        lastRentalDecision: decision,
        orders: [order, ...state.orders],
        listings: state.listings.map((l) =>
          l.id === listingId ? { ...l, status: LISTING_STATUS.RENTED.code } : l
        ),
      };
    }

    case ActionTypes.LOG_BEHAVIOR: {
      const { entry } = action.payload;
      return {
        ...state,
        behaviorLogs: appendBehaviorLog(state.behaviorLogs, entry),
      };
    }

    case ActionTypes.CAPTURE_REPLAY: {
      const { event } = action.payload;
      return {
        ...state,
        sessionReplays: appendReplayEvent(state.sessionReplays, event.sessionId, event),
      };
    }

    case ActionTypes.UPDATE_ORDER_STATUS: {
      const { orderId, status, extra = {} } = action.payload;
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) return state;

      const updatedOrders = state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              ...extra,
              ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
              ...(status === 'paid' ? { paidAt: new Date().toISOString() } : {}),
              ...(status === 'in_use' && !o.rentalStartAt
                ? { rentalStartAt: extra.rentalStartAt ?? new Date().toISOString() }
                : {}),
              ...(status === 'cancelled'
                ? { cancelledAt: new Date().toISOString(), cancelReason: extra.cancelReason }
                : {}),
            }
          : o
      );

      let updatedListings = state.listings;
      if (status === 'completed' || status === 'cancelled') {
        updatedListings = state.listings.map((l) =>
          l.id === order.listingId ? { ...l, status: LISTING_STATUS.AVAILABLE.code } : l
        );
      }

      return {
        ...state,
        orders: updatedOrders,
        listings: updatedListings,
      };
    }

    case ActionTypes.UPDATE_ORDER_SHIPPING: {
      const { orderId, shippingTracking, shippingTrackingEvents } = action.payload;
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                ...(shippingTracking != null ? { shippingTracking } : {}),
                ...(shippingTrackingEvents != null
                  ? { shippingTrackingEvents }
                  : {}),
              }
            : o
        ),
      };
    }

    case ActionTypes.CREATE_RENT_WAITLIST: {
      const {
        listingId,
        renterId,
        requestedStartDate,
        requestedEndDate,
        deliveryMode = 'shipper',
        notes = '',
      } = action.payload;

      const exists = (state.rentWaitlists ?? []).some(
        (w) =>
          w.listingId === listingId &&
          w.renterId === renterId &&
          w.status === 'waiting',
      );
      if (exists) return state;

      const entry = {
        id: generateId('wait'),
        listingId,
        renterId,
        requestedStartDate,
        requestedEndDate,
        deliveryMode,
        notes,
        status: 'waiting',
        createdAt: new Date().toISOString(),
      };

      return {
        ...state,
        rentWaitlists: [entry, ...(state.rentWaitlists ?? [])],
      };
    }

    case ActionTypes.CANCEL_RENT_WAITLIST: {
      const { waitlistId, renterId } = action.payload;
      return {
        ...state,
        rentWaitlists: (state.rentWaitlists ?? []).map((w) =>
          w.id === waitlistId && w.renterId === renterId
            ? { ...w, status: 'cancelled', cancelledAt: new Date().toISOString() }
            : w,
        ),
      };
    }

    case ActionTypes.COMPLETE_AUDIT: {
      const { orderId, auditType, hash } = action.payload;
      const auditHash = hash ?? generateMockHash(`${orderId}-${auditType}`);
      const field = auditType === 'pickup' ? 'auditPickupHash' : 'auditReturnHash';

      const order = state.orders.find((o) => o.id === orderId);
      if (!order) return state;

      const listing = state.listings.find((l) => l.id === order.listingId);
      const updatedListings = listing
        ? state.listings.map((l) =>
            l.id === order.listingId
              ? {
                  ...l,
                  nftPassport: {
                    ...l.nftPassport,
                    auditCount: (l.nftPassport?.auditCount ?? 0) + 1,
                    hash: auditHash,
                  },
                }
              : l
          )
        : state.listings;

      let newStatus = order.status;
      if (auditType === 'pickup' && order.status === 'paid') {
        newStatus = 'audit_pickup';
      } else if (auditType === 'return') {
        newStatus = 'audit_return';
      }

      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === orderId ? { ...o, [field]: auditHash, status: newStatus } : o
        ),
        listings: updatedListings,
      };
    }

    case ActionTypes.UPDATE_KYC: {
      const { userId, kycLevel } = action.payload;
      const updateUser = (u) => {
        if (u.id !== userId) return u;
        const updated = { ...u, kycLevel };
        return { ...updated, trustScore: calcTrustScore(updated) };
      };
      const updatedUser = state.users.find((u) => u.id === userId);
      const nextUser = updatedUser ? updateUser(updatedUser) : null;
      const profiles = (state.identityProfiles ?? []).map((p) => {
        if (p.userId !== userId) return p;
        const kycVerified = kycLevel === 'L2' || kycLevel === 'L3';
        return mergeIdentityChecks(p, {
          cccd: kycVerified,
          ocrCccd: kycVerified,
          faceMatch: kycVerified,
        });
      });

      return {
        ...state,
        users: state.users.map(updateUser),
        user: state.user?.id === userId ? updateUser(state.user) : state.user,
        identityProfiles: nextUser
          ? profiles.some((p) => p.userId === userId)
            ? profiles
            : [...profiles, buildIdentityProfileFromUser(nextUser)]
          : profiles,
      };
    }

    case ActionTypes.UPDATE_PROFILE: {
      const { userId, updates } = action.payload;
      const updateUser = (u) => (u.id === userId ? { ...u, ...updates } : u);

      let next = {
        ...state,
        users: state.users.map(updateUser),
        user: state.user?.id === userId ? updateUser(state.user) : state.user,
      };

      if (next.customers?.some((c) => c.customerId === userId)) {
        next = upsertCustomerProfile(next, {
          customerId: userId,
          updates: {
            fullName: updates.name,
            phone: updates.phone,
            email: updates.email,
            dateOfBirth: updates.dateOfBirth,
            address: {
              streetAddress: updates.address,
            },
          },
          actorId: userId,
        });
      }

      return next;
    }

    case ActionTypes.SAVE_BANK_ACCOUNT: {
      const { customerId, bankAccount, actorId, actorType } = action.payload;
      return applyBankAccountTransaction(state, {
        customerId,
        bankAccount,
        actorId,
        actorType,
      });
    }

    case ActionTypes.ADD_TICKET: {
      const ticket = {
        id: generateId('ticket'),
        status: 'open',
        priority: 'medium',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...action.payload.ticket,
      };
      return {
        ...state,
        tickets: [ticket, ...state.tickets],
      };
    }

    case ActionTypes.UPDATE_TICKET: {
      const { ticketId, updates } = action.payload;
      return {
        ...state,
        tickets: state.tickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                ...updates,
                updatedAt: new Date().toISOString(),
                ...(updates.status === 'resolved' ? { resolvedAt: new Date().toISOString() } : {}),
              }
            : t
        ),
      };
    }

    case ActionTypes.UPDATE_CMS: {
      const { pageId, updates } = action.payload;
      return {
        ...state,
        cmsPages: state.cmsPages.map((p) =>
          p.id === pageId
            ? { ...p, ...updates, updatedAt: new Date().toISOString() }
            : p
        ),
      };
    }

    case ActionTypes.ADD_NOTIFICATION: {
      const notification = {
        id: generateId('notif'),
        read: false,
        createdAt: new Date().toISOString(),
        ...action.payload.notification,
      };
      return {
        ...state,
        notifications: [notification, ...state.notifications],
      };
    }

    case ActionTypes.MARK_NOTIFICATION_READ: {
      const { notificationId } = action.payload;
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
      };
    }

    case ActionTypes.MARK_ALL_NOTIFICATIONS_READ: {
      const { userId } = action.payload;
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.userId === userId ? { ...n, read: true } : n
        ),
      };
    }

    case ActionTypes.WITHDRAW_WALLET: {
      const { userId, amount } = action.payload;
      const fee = FEE_RATES.withdrawFee;
      const netAmount = amount - fee;

      const updateUserWallet = (u) => {
        if (u.id !== userId) return u;
        if (u.walletBalance < amount) return u;
        return { ...u, walletBalance: u.walletBalance - amount };
      };

      const withdrawal = {
        id: generateId('wd'),
        userId,
        amount: netAmount,
        fee,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        bankAccount: state.users.find((u) => u.id === userId)?.bankAccount,
      };

      return {
        ...state,
        users: state.users.map(updateUserWallet),
        user: state.user?.id === userId ? updateUserWallet(state.user) : state.user,
        wallet: {
          ...state.wallet,
          pendingWithdrawals: [...(state.wallet?.pendingWithdrawals ?? []), withdrawal],
        },
      };
    }

    case ActionTypes.PURCHASE_ADS: {
      const { userId, listingId, packageId, price } = action.payload;
      const adsPackage = state.adsPackages.find((p) => p.id === packageId);
      if (!adsPackage) return state;

      const cost = price ?? adsPackage.price;
      const user = state.users.find((u) => u.id === userId);
      if (!user || user.walletBalance < cost) return state;

      const updateUser = (u) =>
        u.id === userId ? { ...u, walletBalance: u.walletBalance - cost } : u;

      let newState = {
        ...state,
        users: state.users.map(updateUser),
        user: state.user?.id === userId ? updateUser(state.user) : state.user,
        wallet: {
          ...state.wallet,
          recentTransactions: [
            {
              id: generateId('txn'),
              type: 'ads_purchase',
              userId,
              amount: cost,
              description: `Mua ${adsPackage.name}`,
              createdAt: new Date().toISOString(),
            },
            ...(state.wallet?.recentTransactions ?? []),
          ],
        },
      };

      if (listingId) {
        if (adsPackage.type === 'push_up') {
          newState = relooReducer(newState, {
            type: ActionTypes.BOOST_LISTING,
            payload: { listingId, labels: ['Tin ưu tiên'], durationDays: 1 },
          });
        } else if (adsPackage.type === 'label') {
          newState = relooReducer(newState, {
            type: ActionTypes.BOOST_LISTING,
            payload: {
              listingId,
              labels: [adsPackage.labelType || 'Tin ưu tiên'],
              durationDays: adsPackage.durationDays ?? 3,
            },
          });
        }
      }

      if (adsPackage.type === 'pro_store') {
        newState = {
          ...newState,
          users: newState.users.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  isPro: true,
                  proExpiry: new Date(
                    Date.now() + (adsPackage.durationDays ?? 30) * 86400000
                  ).toISOString(),
                }
              : u
          ),
        };
        if (newState.user?.id === userId) {
          newState.user = newState.users.find((u) => u.id === userId);
        }
      }

      return newState;
    }

    case ActionTypes.RESOLVE_RISK: {
      const { alertId, resolution } = action.payload;
      return {
        ...state,
        riskAlerts: state.riskAlerts.map((a) =>
          a.id === alertId
            ? {
                ...a,
                status: 'resolved',
                resolution,
                resolvedAt: new Date().toISOString(),
              }
            : a
        ),
      };
    }

    case ActionTypes.UPDATE_SETTINGS: {
      return {
        ...state,
        settings: { ...state.settings, ...action.payload.settings },
      };
    }

    case ActionTypes.UPDATE_LEAD: {
      const { leadId, updates } = action.payload;
      return {
        ...state,
        leads: state.leads.map((l) =>
          l.id === leadId ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
        ),
      };
    }

    case ActionTypes.ADD_LEAD: {
      const lead = {
        id: generateId('lead'),
        status: 'new',
        createdAt: new Date().toISOString(),
        assignedTo: null,
        ...action.payload.lead,
      };
      return {
        ...state,
        leads: [lead, ...state.leads],
      };
    }

    case ActionTypes.SET_GUEST_LOCATION: {
      return {
        ...state,
        guestLocation: action.payload.location,
      };
    }

    case ActionTypes.UPDATE_RISK_ALERT: {
      const { alertId, updates } = action.payload;
      return {
        ...state,
        riskAlerts: state.riskAlerts.map((a) =>
          a.id === alertId ? { ...a, ...updates } : a
        ),
      };
    }

    case ActionTypes.ENSURE_INQUIRY_THREAD: {
      const { listingId, buyerId } = action.payload;
      const listing = state.listings.find((l) => l.id === listingId);
      if (!listing || !buyerId || listing.ownerId === buyerId) return state;

      const id = `inquiry_${listingId}_${buyerId}`;
      if (state.chatThreads?.some((t) => t.id === id)) return state;

      const thread = {
        id,
        type: 'inquiry',
        listingId,
        orderId: null,
        lenderId: listing.ownerId,
        buyerId,
        messages: [
          {
            id: generateId('msg'),
            type: 'system',
            senderId: 'system',
            text: `Cuộc trao đổi về sản phẩm: ${listing.title}`,
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return { ...state, chatThreads: [thread, ...(state.chatThreads ?? [])] };
    }

    case ActionTypes.ENSURE_ORDER_THREAD: {
      const { orderId } = action.payload;
      const order = state.orders.find((o) => o.id === orderId);
      if (!order || order.status === 'cancelled') return state;

      const id = `order_${orderId}`;
      if (state.chatThreads?.some((t) => t.id === id)) return state;

      const listing = state.listings.find((l) => l.id === order.listingId);
      const thread = {
        id,
        type: 'order',
        listingId: order.listingId,
        orderId: order.id,
        lenderId: order.lenderId,
        buyerId: order.renterId,
        messages: [],
        createdAt: order.createdAt,
        updatedAt: order.createdAt,
      };

      if (listing) {
        thread.messages.push({
          id: generateId('msg'),
          type: 'system',
          senderId: 'system',
          text: `Trao đổi đơn thuê: ${listing.title}`,
          createdAt: order.createdAt,
        });
      }

      return { ...state, chatThreads: [...(state.chatThreads ?? []), thread] };
    }

    case ActionTypes.SEND_CHAT_MESSAGE: {
      const { threadId, message } = action.payload;
      const msg = {
        id: message.id ?? generateId('msg'),
        createdAt: message.createdAt ?? new Date().toISOString(),
        readBy: message.readBy ?? [],
        ...message,
      };

      return {
        ...state,
        chatThreads: (state.chatThreads ?? []).map((t) =>
          t.id === threadId
            ? {
                ...t,
                messages: [...t.messages, msg],
                updatedAt: msg.createdAt,
              }
            : t
        ),
      };
    }

    case ActionTypes.RECEIVE_CHAT_MESSAGE: {
      const { threadId, message } = action.payload;
      if (!threadId || !message?.id) return state;

      return {
        ...state,
        chatThreads: (state.chatThreads ?? []).map((t) => {
          if (t.id !== threadId) return t;
          if (t.messages.some((m) => m.id === message.id)) return t;
          const msg = {
            readBy: [],
            ...message,
            createdAt: message.createdAt ?? new Date().toISOString(),
          };
          return {
            ...t,
            messages: [...t.messages, msg],
            updatedAt: msg.createdAt,
          };
        }),
      };
    }

    case ActionTypes.MARK_MESSAGES_READ_BY: {
      const { threadId, readerId, readAt } = action.payload;
      if (!threadId || !readerId) return state;
      const at = readAt ?? new Date().toISOString();

      return {
        ...state,
        chatThreads: (state.chatThreads ?? []).map((t) => {
          if (t.id !== threadId) return t;
          return {
            ...t,
            readCursor: { ...(t.readCursor ?? {}), [readerId]: at },
            messages: t.messages.map((m) => {
              if (m.type === 'system' || m.senderId === readerId) return m;
              const readBy = m.readBy ?? [];
              if (readBy.includes(readerId)) return m;
              return { ...m, readBy: [...readBy, readerId] };
            }),
          };
        }),
      };
    }

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const RelooContext = createContext(null);

// ─── Persistence ─────────────────────────────────────────────────────────────

function loadPersistedState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or private browsing - silently ignore
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function RelooProvider({ children, initialState }) {
  const [state, dispatch] = useReducer(relooReducer, initialState ?? getInitialState());
  const [hydrated, setHydrated] = useReducer(() => true, false);

  useEffect(() => {
    const persisted = loadPersistedState();
    if (persisted) {
      if (isSupabaseConfigured()) {
        const { listings: _l, users: _u, orders: _o, ...sessionState } = persisted;
        dispatch({ type: ActionTypes.HYDRATE, payload: sessionState });
      } else {
        dispatch({ type: ActionTypes.HYDRATE, payload: persisted });
      }
    }
    setHydrated();
  }, []);

  useEffect(() => {
    if (!hydrated || !isSupabaseConfigured()) return;

    let cancelled = false;

    fetch('/api/db/bootstrap')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.ok) return;
        dispatch({
          type: ActionTypes.SYNC_FROM_DB,
          payload: {
            listings: data.listings,
            users: data.users,
            orders: data.orders,
            settings: data.settings,
          },
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (hydrated) {
      saveState(state);
    }
  }, [state, hydrated]);

  const actions = useMemo(
    () => ({
      login: (userId) => dispatch({ type: ActionTypes.LOGIN, payload: { userId } }),
      logout: () => dispatch({ type: ActionTypes.LOGOUT }),
      switchUser: (userId) => dispatch({ type: ActionTypes.SWITCH_USER, payload: { userId } }),
      registerUser: (profile) =>
        dispatch({ type: ActionTypes.REGISTER_USER, payload: { profile } }),
      createListing: (listing) =>
        dispatch({ type: ActionTypes.CREATE_LISTING, payload: { listing } }),
      updateListing: (listingId, updates) =>
        dispatch({ type: ActionTypes.UPDATE_LISTING, payload: { listingId, updates } }),
      boostListing: (listingId, options = {}) =>
        dispatch({ type: ActionTypes.BOOST_LISTING, payload: { listingId, ...options } }),
      createRentWaitlist: (payload) =>
        dispatch({ type: ActionTypes.CREATE_RENT_WAITLIST, payload }),
      cancelRentWaitlist: (waitlistId, renterId) =>
        dispatch({
          type: ActionTypes.CANCEL_RENT_WAITLIST,
          payload: { waitlistId, renterId },
        }),
      updateOrderStatus: (orderId, status, extra) =>
        dispatch({ type: ActionTypes.UPDATE_ORDER_STATUS, payload: { orderId, status, extra } }),
      updateOrderShipping: (orderId, payload) =>
        dispatch({
          type: ActionTypes.UPDATE_ORDER_SHIPPING,
          payload: { orderId, ...payload },
        }),
      completeAudit: (orderId, auditType, hash) =>
        dispatch({ type: ActionTypes.COMPLETE_AUDIT, payload: { orderId, auditType, hash } }),
      updateKyc: (userId, kycLevel) =>
        dispatch({ type: ActionTypes.UPDATE_KYC, payload: { userId, kycLevel } }),
      updateProfile: (userId, updates) =>
        dispatch({ type: ActionTypes.UPDATE_PROFILE, payload: { userId, updates } }),
      addTicket: (ticket) => dispatch({ type: ActionTypes.ADD_TICKET, payload: { ticket } }),
      updateTicket: (ticketId, updates) =>
        dispatch({ type: ActionTypes.UPDATE_TICKET, payload: { ticketId, updates } }),
      updateCms: (pageId, updates) =>
        dispatch({ type: ActionTypes.UPDATE_CMS, payload: { pageId, updates } }),
      addNotification: (notification) =>
        dispatch({ type: ActionTypes.ADD_NOTIFICATION, payload: { notification } }),
      markNotificationRead: (notificationId) =>
        dispatch({ type: ActionTypes.MARK_NOTIFICATION_READ, payload: { notificationId } }),
      markAllNotificationsRead: (userId) =>
        dispatch({
          type: ActionTypes.MARK_ALL_NOTIFICATIONS_READ,
          payload: { userId },
        }),
      withdrawWallet: (userId, amount) =>
        dispatch({ type: ActionTypes.WITHDRAW_WALLET, payload: { userId, amount } }),
      purchaseAds: (payload) => dispatch({ type: ActionTypes.PURCHASE_ADS, payload }),
      resolveRisk: (alertId, resolution) =>
        dispatch({ type: ActionTypes.RESOLVE_RISK, payload: { alertId, resolution } }),
      updateSettings: (settings) =>
        dispatch({ type: ActionTypes.UPDATE_SETTINGS, payload: { settings } }),
      updateLead: (leadId, updates) =>
        dispatch({ type: ActionTypes.UPDATE_LEAD, payload: { leadId, updates } }),
      addLead: (lead) => dispatch({ type: ActionTypes.ADD_LEAD, payload: { lead } }),
      updateRiskAlert: (alertId, updates) =>
        dispatch({ type: ActionTypes.UPDATE_RISK_ALERT, payload: { alertId, updates } }),
      setGuestLocation: (location) =>
        dispatch({ type: ActionTypes.SET_GUEST_LOCATION, payload: { location } }),
      ensureInquiryThread: (listingId, buyerId) =>
        dispatch({ type: ActionTypes.ENSURE_INQUIRY_THREAD, payload: { listingId, buyerId } }),
      ensureOrderThread: (orderId) =>
        dispatch({ type: ActionTypes.ENSURE_ORDER_THREAD, payload: { orderId } }),
      sendChatMessage: (threadId, message) =>
        dispatch({ type: ActionTypes.SEND_CHAT_MESSAGE, payload: { threadId, message } }),
      receiveChatMessage: (threadId, message) =>
        dispatch({ type: ActionTypes.RECEIVE_CHAT_MESSAGE, payload: { threadId, message } }),
      markMessagesReadBy: (threadId, readerId, readAt) =>
        dispatch({
          type: ActionTypes.MARK_MESSAGES_READ_BY,
          payload: { threadId, readerId, readAt },
        }),
      saveBankAccount: (customerId, bankAccount, actorId, actorType = 'user') =>
        dispatch({
          type: ActionTypes.SAVE_BANK_ACCOUNT,
          payload: { customerId, bankAccount, actorId, actorType },
        }),
      resetToSeed: () => dispatch({ type: ActionTypes.HYDRATE, payload: createSeedState() }),
    }),
    [dispatch]
  );

  const value = useMemo(
    () => ({
      state,
      dispatch,
      actions,
      hydrated,
    }),
    [state, dispatch, actions, hydrated]
  );

  return <RelooContext.Provider value={value}>{children}</RelooContext.Provider>;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useReloo() {
  const context = useContext(RelooContext);
  if (!context) {
    throw new Error('useReloo phải được sử dụng trong RelooProvider');
  }
  return context;
}

export function useAuth() {
  const { state, actions, hydrated } = useReloo();
  const { user, users, customers, customerBankAccounts } = state;

  return {
    user,
    users,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isLender: user?.role === 'lender' || user?.role === 'both',
    isRenter: user?.role === 'renter' || user?.role === 'both',
    hydrated,
    login: actions.login,
    logout: actions.logout,
    switchUser: actions.switchUser,
    registerUser: actions.registerUser,
    updateKyc: (kycLevel) => user && actions.updateKyc(user.id, kycLevel),
    updateProfile: (updates) => user && actions.updateProfile(user.id, updates),
    saveBankAccount: (bankAccount) =>
      user && actions.saveBankAccount(user.id, bankAccount, user.id, 'user'),
    customer: user ? (customers ?? []).find((c) => c.customerId === user.id) : null,
    primaryBankAccount: user
      ? (customerBankAccounts ?? []).find(
          (a) => a.customerId === user.id && a.isPrimary && a.status === 'active'
        )
      : null,
  };
}

export function useListings(filters = {}) {
  const { state, actions, hydrated } = useReloo();
  const { category, status, ownerId, search, boostedOnly } = filters;

  const listings = useMemo(() => {
    let result = [...state.listings];

    if (category) {
      result = result.filter((l) => l.category === category);
    }
    if (status) {
      result = result.filter((l) => l.status === status);
    }
    if (ownerId) {
      result = result.filter((l) => l.ownerId === ownerId);
    }
    if (boostedOnly) {
      result = result.filter((l) => l.isBoosted);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return result;
  }, [state.listings, category, status, ownerId, search, boostedOnly]);

  const getListingById = useCallback(
    (id) => state.listings.find((l) => l.id === id),
    [state.listings]
  );

  const getOwner = useCallback(
    (ownerId) => state.users.find((u) => u.id === ownerId),
    [state.users]
  );

  const rankedCategories = useMemo(
    () => rankCategories(state.categories, state.listings),
    [state.categories, state.listings]
  );

  return {
    listings,
    allListings: state.listings,
    categories: rankedCategories,
    getListingById,
    getOwner,
    createListing: actions.createListing,
    updateListing: actions.updateListing,
    boostListing: actions.boostListing,
    purchaseAds: actions.purchaseAds,
    dbSynced: state.dbSynced ?? false,
    dbLoading: isSupabaseConfigured() && hydrated && !state.dbSynced,
  };
}

export function useOrders(filters = {}) {
  const { state, actions } = useReloo();
  const { status, renterId, lenderId, userId } = filters;

  const orders = useMemo(() => {
    let result = [...state.orders];

    if (status) {
      result = result.filter((o) => o.status === status);
    }
    if (renterId) {
      result = result.filter((o) => o.renterId === renterId);
    }
    if (lenderId) {
      result = result.filter((o) => o.lenderId === lenderId);
    }
    if (userId) {
      result = result.filter((o) => o.renterId === userId || o.lenderId === userId);
    }

    const seen = new Set();
    result = result.filter((o) => {
      if (!o?.id || seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });

    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return result;
  }, [state.orders, status, renterId, lenderId, userId]);

  const getOrderById = useCallback(
    (id) => state.orders.find((o) => o.id === id),
    [state.orders]
  );

  const getOrderListing = useCallback(
    (order) => state.listings.find((l) => l.id === order?.listingId),
    [state.listings]
  );

  return {
    orders,
    allOrders: state.orders,
    riskAlerts: state.riskAlerts,
    lastRentalDecision: state.lastRentalDecision,
    getOrderById,
    getOrderListing,
    createOrder: actions.createOrder,
    updateOrderStatus: actions.updateOrderStatus,
    updateOrderShipping: actions.updateOrderShipping,
    completeAudit: actions.completeAudit,
    resolveRisk: actions.resolveRisk,
  };
}

export function useNotifications() {
  const { state, actions } = useReloo();
  const { user } = useAuth();

  const notifications = useMemo(() => {
    if (!user?.id) return [];
    return state.notifications
      .filter((n) => n.userId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [state.notifications, user?.id]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    markNotificationRead: actions.markNotificationRead,
    markAllNotificationsRead: actions.markAllNotificationsRead,
  };
}

export function useChat() {
  const { state, actions } = useReloo();
  const { chatThreads = [], listings, users } = state;

  const getThreadById = useCallback(
    (id) => chatThreads.find((t) => t.id === id),
    [chatThreads]
  );

  const getThreadListing = useCallback(
    (thread) => listings.find((l) => l.id === thread?.listingId),
    [listings]
  );

  const getThreadCounterparty = useCallback(
    (thread, userId) => {
      if (!thread || !userId) return null;
      const otherId =
        thread.buyerId === userId ? thread.lenderId : thread.buyerId;
      return users.find((u) => u.id === otherId) ?? null;
    },
    [users]
  );

  const getUserThreads = useCallback(
    (userId) => {
      if (!userId) return [];
      return chatThreads
        .filter((t) => t.buyerId === userId || t.lenderId === userId)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },
    [chatThreads]
  );

  return {
    chatThreads,
    getThreadById,
    getThreadListing,
    getThreadCounterparty,
    getUserThreads,
    ensureInquiryThread: actions.ensureInquiryThread,
    ensureOrderThread: actions.ensureOrderThread,
    sendChatMessage: actions.sendChatMessage,
    receiveChatMessage: actions.receiveChatMessage,
    markMessagesReadBy: actions.markMessagesReadBy,
  };
}

export { RelooContext, relooReducer, getInitialState };
