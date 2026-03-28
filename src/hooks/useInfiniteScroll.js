import { useState, useEffect, useRef, useCallback } from 'react';

export const useInfiniteScroll = (fetchFunction, options = {}) => {
  const {
    initialPage = 1,
    limit = 10,
    threshold = 500,
  } = options;

  const [data, setData] = useState([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const observerRef = useRef();
  const lastElementRef = useRef();
  const loadingRef = useRef(false);

  const fetchData = useCallback(async (pageNumber) => {
    // Prevent concurrent fetches
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction({ page: pageNumber, limit });

      if (result && result.data) {
        setData(prev => {
          const newData = result.data.filter(
            item => !prev.some(existing => existing.id === item.id)
          );
          return pageNumber === 1 ? result.data : [...prev, ...newData];
        });
        setHasMore(result.hasMore !== undefined ? result.hasMore : result.data.length === limit);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [fetchFunction, limit]);

  // Initial fetch
  useEffect(() => {
    let isMounted = true;

    if (isMounted) {
      fetchData(initialPage);
    }

    return () => {
      isMounted = false;
    };
  }, [fetchData, initialPage]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (loading || !hasMore) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          setPage(prev => prev + 1);
        }
      },
      { rootMargin: `${threshold}px` }
    );

    const currentElement = lastElementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    observerRef.current = observer;

    return () => {
      if (currentElement && observerRef.current) {
        observerRef.current.unobserve(currentElement);
      }
    };
  }, [loading, hasMore, threshold]);

  // Fetch next page when page changes
  useEffect(() => {
    if (page > initialPage && !loadingRef.current) {
      fetchData(page);
    }
  }, [page, initialPage, fetchData]);

  const refresh = useCallback(() => {
    setData([]);
    setPage(initialPage);
    setHasMore(true);
    setError(null);
    loadingRef.current = false;
    fetchData(initialPage);
  }, [initialPage, fetchData]);

  return {
    data,
    loading,
    error,
    hasMore,
    lastElementRef,
    refresh,
  };
};



