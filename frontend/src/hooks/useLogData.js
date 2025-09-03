// --- VERSION 0.0.1 ---
// - Optional hook to fetch a single log or a trip group detail,
//   returning a normalized { data, columns } + raw.
// - Includes console logging for debugging in program_logs.

import { useEffect, useMemo, useState } from 'react';

export function useLogData(logId, type = 'log') {
  const [state, setState] = useState({
    loading: false,
    error: null,
    log: null,
    raw: null
  });

  useEffect(() => {
    if (!logId) return;
    let mounted = true;
    const endpoint =
      type === 'group'
        ? `/api/trip-groups/${logId}`
        : `/api/logs/${logId}/data`;

    console.log(`[useLogData] fetching ${endpoint}`);
    setState((s) => ({ ...s, loading: true, error: null }));

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        console.log(
          `[useLogData] loaded ${type} ${logId} with`,
          type === 'group'
            ? `${data?.logs?.length || 0} logs`
            : `${Array.isArray(data?.data) ? data.data.length : 0} rows`
        );

        if (type === 'group') {
          const logs = data?.logs || [];
          const logDataMap = data?.log_data || {};
          const primaryId = logs[0]?.log_id;
          const primaryData = primaryId ? logDataMap[primaryId] || [] : [];
          const columns = primaryData.length
            ? Object.keys(primaryData[0])
            : [];
          setState({
            loading: false,
            error: null,
            log: { data: primaryData, columns },
            raw: data
          });
        } else {
          const columns = Array.isArray(data?.columns)
            ? data.columns
            : data?.data?.length
            ? Object.keys(data.data[0])
            : [];
          setState({
            loading: false,
            error: null,
            log: { data: data?.data || [], columns },
            raw: data
          });
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error(`[useLogData] Error fetching ${type} ${logId}:`, err);
        setState({ loading: false, error: err, log: null, raw: null });
      });

    return () => {
      mounted = false;
    };
  }, [logId, type]);

  const result = useMemo(() => state, [state]);
  return result;
}
