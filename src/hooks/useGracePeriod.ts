"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/src/integrations/supabase/client";

export function useGracePeriod(
  orderCreatedAt: string,
  orderStatus: string = "pending"
) {
  const [canCancel, setCanCancel] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(5);
  const [loading, setLoading] = useState(true);

  // Fetch settings once
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("settings")
          .select("cancellation_grace_period_minutes")
          .limit(1)
          .single();

        if (data?.cancellation_grace_period_minutes !== undefined) {
          setGracePeriodMinutes(data.cancellation_grace_period_minutes);
        }
      } catch (error) {
        console.error("Error fetching grace period settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Timer logic
  useEffect(() => {
    if (loading) return;

    const calculateTime = () => {
      if (orderStatus !== "pending") {
        setCanCancel(false);
        setRemainingSeconds(0);
        return;
      }

      const createdTime = new Date(orderCreatedAt).getTime();
      const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
      const expiryTime = createdTime + gracePeriodMs;
      const now = Date.now();
      const diffMs = expiryTime - now;

      if (diffMs > 0) {
        setCanCancel(true);
        setRemainingSeconds(Math.ceil(diffMs / 1000));
      } else {
        setCanCancel(false);
        setRemainingSeconds(0);
      }
    };

    calculateTime(); // Initial check
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [loading, gracePeriodMinutes, orderCreatedAt, orderStatus]);

  return { canCancel, remainingSeconds, gracePeriodMinutes, loading };
}
