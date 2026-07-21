/**
 * Map seed-data.js → Supabase row format
 */

function mapIdentityStatus(status) {
  const normalized = String(status ?? 'pending').toUpperCase();
  const map = {
    UNVERIFIED: 'pending',
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
    EXPIRED: 'expired',
  };
  return map[normalized] ?? 'pending';
}

export function mapProfile(user) {
  const {
    id,
    email,
    phone,
    name,
    avatar,
    role,
    kycLevel,
    trustScore,
    ...rest
  } = user;

  return {
    id,
    email,
    phone: phone ?? null,
    name,
    avatar_url: avatar ?? null,
    role,
    kyc_level: kycLevel ?? 'L0',
    trust_score: trustScore ?? 0,
    status: 'active',
    profile_data: rest,
  };
}

export function mapIdentityProfile(profile) {
  const checks = profile.checks ?? {};
  return {
    id: `idp_${profile.userId}`,
    user_id: profile.userId,
    status: mapIdentityStatus(profile.status),
    email_verified: Boolean(checks.email),
    phone_verified: Boolean(checks.phone),
    cccd_hash: profile.cccdHash ?? null,
    ocr_verified: Boolean(checks.ocrCccd || checks.cccd),
    face_match_verified: Boolean(checks.faceMatch),
    verified_at: profile.verifiedAt ?? null,
    checks,
  };
}

export function mapCustomerProfile(customer) {
  return {
    id: customer.customerId ?? customer.userId,
    user_id: customer.userId,
    customer_data: customer,
  };
}

export function mapAsset(listing) {
  const {
    id,
    ownerId,
    title,
    description,
    category,
    dailyPrice,
    marketValue,
    location,
    locationDetails,
    images,
    specs,
    condition,
    status,
    trustBadges,
    labels,
    rating,
    reviewCount,
    viewCount,
    isBoosted,
    nftPassport,
    ...rest
  } = listing;

  return {
    asset: {
      id,
      owner_id: ownerId,
      title,
      description: description ?? null,
      category,
      daily_price: dailyPrice,
      market_value: marketValue,
      location: location ?? null,
      location_details: locationDetails ?? {},
      images: images ?? [],
      specs: specs ?? {},
      condition: condition ?? null,
      status: status ?? 'available',
      trust_badges: trustBadges ?? [],
      labels: labels ?? [],
      rating: rating ?? null,
      review_count: reviewCount ?? 0,
      view_count: viewCount ?? 0,
      is_boosted: isBoosted ?? false,
      listing_data: rest,
    },
    passport: nftPassport
      ? {
          id: nftPassport.id,
          asset_id: id,
          nft_token_id: nftPassport.id,
          chain_hash: nftPassport.hash ?? null,
          audit_count: nftPassport.auditCount ?? 0,
          residual_value: nftPassport.residualValue ?? null,
          minted_at: nftPassport.mintedAt ?? null,
          passport_data: {},
        }
      : null,
  };
}

export function mapTransaction(order) {
  const {
    id,
    listingId,
    renterId,
    lenderId,
    status,
    days,
    dailyPrice,
    rentalTotal,
    platformFee,
    relooCareFee,
    relooCarePlan,
    deposit,
    shippingFee,
    grandTotal,
    startDate,
    endDate,
    auditPickupHash,
    auditReturnHash,
    createdAt,
    ...rest
  } = order;

  return {
    transaction: {
      id,
      asset_id: listingId,
      renter_id: renterId,
      lender_id: lenderId,
      status,
      days,
      daily_price: dailyPrice,
      rental_total: rentalTotal ?? 0,
      platform_fee: platformFee ?? 0,
      reloo_care_fee: relooCareFee ?? 0,
      reloo_care_plan: relooCarePlan ?? null,
      deposit_amount: deposit ?? 0,
      shipping_fee: shippingFee ?? 0,
      grand_total: grandTotal ?? 0,
      start_date: startDate ? startDate.slice(0, 10) : null,
      end_date: endDate ? endDate.slice(0, 10) : null,
      created_at: createdAt ?? new Date().toISOString(),
      order_data: rest,
    },
    auditEvents: [
      auditPickupHash
        ? {
            id: `audit_pickup_${id}`,
            transaction_id: id,
            audit_type: 'pickup',
            hash_sha256: auditPickupHash,
          }
        : null,
      auditReturnHash
        ? {
            id: `audit_return_${id}`,
            transaction_id: id,
            audit_type: 'return',
            hash_sha256: auditReturnHash,
          }
        : null,
    ].filter(Boolean),
  };
}

export function mapCmsPage(page) {
  const { id, slug, title, metaDescription, content, published, updatedAt, faqs, ...rest } =
    page;
  return {
    page: {
      id,
      slug,
      title,
      meta_description: metaDescription ?? null,
      content: content ?? '',
      published: Boolean(published),
      updated_at: updatedAt ?? new Date().toISOString(),
      page_data: rest,
    },
    faqs: (faqs ?? []).map((f) => ({
      id: f.id,
      category: 'help',
      question: f.question,
      answer: f.answer,
      sort_order: 0,
      published: true,
    })),
  };
}

export function mapLead(lead) {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone ?? null,
    email: lead.email ?? null,
    source: lead.source ?? null,
    interest: lead.interest ?? null,
    status: lead.status ?? 'new',
    notes: lead.notes ?? null,
    assigned_to: lead.assignedTo ?? null,
    lead_data: {},
    created_at: lead.createdAt ?? new Date().toISOString(),
  };
}

export function mapTicket(ticket) {
  const { id, subject, description, userId, orderId, status, priority, category, assignee, messages, createdAt, updatedAt, resolvedAt, ...rest } =
    ticket;

  return {
    ticket: {
      id,
      subject,
      description: description ?? null,
      user_id: userId ?? null,
      transaction_id: orderId ?? null,
      status: status ?? 'open',
      priority: priority ?? 'medium',
      category: category ?? null,
      assignee: assignee ?? null,
      ticket_data: rest,
      created_at: createdAt ?? new Date().toISOString(),
      updated_at: updatedAt ?? createdAt ?? new Date().toISOString(),
      resolved_at: resolvedAt ?? null,
    },
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      ticket_id: id,
      sender_id: m.sender,
      body: m.text,
      created_at: m.createdAt ?? new Date().toISOString(),
    })),
  };
}

export function mapRiskAlert(alert) {
  return {
    id: alert.id,
    alert_type: alert.type,
    severity: alert.level ?? 'medium',
    user_id: alert.userId ?? null,
    transaction_id: alert.orderId ?? null,
    asset_id: null,
    title: alert.title,
    description: alert.description ?? null,
    status: alert.status ?? 'open',
    alert_data: {
      gpsLastSeen: alert.gpsLastSeen,
      geofenceViolation: alert.geofenceViolation,
      actions: alert.actions,
      resolution: alert.resolution,
    },
    created_at: alert.createdAt ?? new Date().toISOString(),
    resolved_at: alert.resolvedAt ?? null,
  };
}

export function mapNotification(n) {
  return {
    id: n.id,
    user_id: n.userId,
    title: n.title,
    body: n.message ?? null,
    notification_type: n.type ?? 'info',
    link: n.link ?? null,
    is_read: Boolean(n.read),
    notification_data: {},
    created_at: n.createdAt ?? new Date().toISOString(),
  };
}

export function mapChatThread(thread) {
  const { id, type, listingId, orderId, lenderId, buyerId, messages, createdAt, updatedAt } =
    thread;

  return {
    thread: {
      id,
      thread_type: type === 'order' ? 'order' : 'inquiry',
      listing_id: listingId ?? null,
      transaction_id: orderId ?? null,
      lender_id: lenderId,
      buyer_id: buyerId,
      thread_data: {},
      created_at: createdAt ?? new Date().toISOString(),
      updated_at: updatedAt ?? createdAt ?? new Date().toISOString(),
    },
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      thread_id: id,
      sender_id: m.senderId,
      message_type: m.type ?? 'text',
      body: m.text ?? null,
      message_data: {},
      read_by: [],
      created_at: m.createdAt ?? new Date().toISOString(),
    })),
  };
}
