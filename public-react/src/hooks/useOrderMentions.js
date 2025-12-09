import { useMemo, useCallback } from 'react';

/**
 * Custom hook để quản lý logic mentions trong order notes
 */
export function useOrderMentions(order) {
  const orderMentionLookup = useMemo(() => {
    const map = new Map();
    (order?.noteMentions || []).forEach((mention) => {
      const userId =
        mention?.user?._id ||
        mention?.user ||
        mention?._id;
      if (userId) {
        map.set(userId.toString(), mention);
      }
    });
    return map;
  }, [order]);

  const filterMentionsByNote = useCallback((mentions = [], noteText = '') => {
    if (!noteText) return [];
    const normalized = noteText.toLowerCase();
    return mentions.filter((mention) => {
      const name = mention?.user?.fullName?.toLowerCase();
      const email = mention?.user?.email?.toLowerCase();
      if (name && normalized.includes(`@${name}`)) {
        return true;
      }
      if (email && normalized.includes(`@${email}`)) {
        return true;
      }
      return false;
    });
  }, []);

  const getPaintingMentions = useCallback(
    (painting) => {
      if (!painting) return [];
      const noteText = painting.note || '';
      const baseMentions =
        Array.isArray(painting.noteMentions) && painting.noteMentions.length > 0
          ? painting.noteMentions
          : [];

      const enriched = baseMentions
        .map((mention) => {
          if (mention?.user?.fullName || mention?.user?.email) {
            return mention;
          }
          const userId =
            mention?.user?._id ||
            mention?.user ||
            mention?._id ||
            mention;
          if (!userId) return null;
          return orderMentionLookup.get(userId.toString()) || null;
        })
        .filter(Boolean);

      const filtered = filterMentionsByNote(enriched, noteText);
      if (filtered.length > 0) {
        return filtered;
      }

      const fallbackList = filterMentionsByNote(
        Array.from(orderMentionLookup.values()),
        noteText
      );
      return fallbackList;
    },
    [filterMentionsByNote, orderMentionLookup]
  );

  const orderNoteMentions = useMemo(() => {
    if (!order?.note) return [];
    return filterMentionsByNote(order.noteMentions || [], order.note);
  }, [order, filterMentionsByNote]);

  return {
    orderMentionLookup,
    filterMentionsByNote,
    getPaintingMentions,
    orderNoteMentions
  };
}

