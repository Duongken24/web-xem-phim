const REASON_TAG_LABELS: Record<string, string> = {
  same_genre: 'cùng thể loại',
  same_language: 'cùng ngôn ngữ',
  same_country: 'cùng quốc gia',
  same_type: 'cùng dạng phim',
  close_release_year: 'cùng giai đoạn phát hành',
  similar_runtime: 'thời lượng gần giống',
  same_age_rating: 'cùng mức phân loại',
  metadata_overlap: 'nội dung gần giống',
  behavior_overlap: 'hợp với gu xem gần đây',
  well_rated: 'được đánh giá tốt',
  trending: 'đang được quan tâm',
  featured: 'nổi bật trên hệ thống',
  playable: 'có thể xem ngay',
};

function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function looksMachineLikeReason(value: string) {
  return /\b[a-z0-9]+_[a-z0-9_]+\b/i.test(value);
}

function joinReasonLabels(labels: string[]) {
  if (labels.length <= 1) return labels[0] || '';
  if (labels.length === 2) return `${labels[0]} và ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} và ${labels[labels.length - 1]}`;
}

export function formatRecommendationReasonTag(tag: string, options?: { capitalize?: boolean }) {
  const normalized = String(tag || '').trim().toLowerCase();
  if (!normalized) return null;

  let label = REASON_TAG_LABELS[normalized];
  if (!label) {
    if (normalized.includes('_')) {
      return null;
    }

    label = normalized.replace(/[-_]+/g, ' ').trim();
  }

  return options?.capitalize ? capitalizeFirst(label) : label;
}

export function formatRecommendationReasonTags(tags: string[] | null | undefined, max = 3) {
  const uniqueLabels: string[] = [];

  for (const tag of Array.isArray(tags) ? tags : []) {
    const label = formatRecommendationReasonTag(tag);
    if (!label || uniqueLabels.includes(label)) continue;
    uniqueLabels.push(label);
    if (uniqueLabels.length >= max) break;
  }

  return uniqueLabels;
}

export function formatRecommendationReasonSentence(
  tags: string[] | null | undefined,
  fallback = 'Phù hợp với gu xem gần đây của bạn.'
) {
  const labels = formatRecommendationReasonTags(tags);
  if (!labels.length) return fallback;
  return `Gợi ý vì ${joinReasonLabels(labels)}.`;
}

export function formatRecommendationReasonText(
  reason: string | null | undefined,
  tags: string[] | null | undefined,
  fallback = 'Phù hợp với lựa chọn của bạn.'
) {
  const cleanedReason = String(reason || '').replace(/\s+/g, ' ').trim();

  if (cleanedReason && !looksMachineLikeReason(cleanedReason)) {
    return cleanedReason;
  }

  return formatRecommendationReasonSentence(tags, fallback);
}
