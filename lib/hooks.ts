import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  getUserProfile,
  getDailyWasteSummary,
  getWeeklySummary,
  getWasteDataForToday,
  getWasteDataForWeek,
  getTrashLogStats,
  getUserWasteStats,
  getWasteTimeline,
} from "@/lib/db-queries";

// Hook สำหรับดึงข้อมูล User ที่ logged in
export function useCurrentUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        setUser(authUser);
      } catch (error) {
        console.error("Error fetching current user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading };
}

// Hook สำหรับหน้า Home
export function useHomeData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dailySummary, wasteDataToday, trashStats] = await Promise.all([
          getDailyWasteSummary(),
          getWasteDataForToday(),
          getTrashLogStats(),
        ]);

        setData({
          dailySummary,
          wasteDataToday,
          trashStats,
        });
      } catch (error) {
        console.error("Error fetching home data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading };
}

// Hook สำหรับหน้า History
export function useHistoryData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [weeklySummary, wasteDataWeek, timeline] = await Promise.all([
          getWeeklySummary(),
          getWasteDataForWeek(),
          getWasteTimeline(),
        ]);

        setData({
          weeklySummary,
          wasteDataWeek,
          timeline,
        });
      } catch (error) {
        console.error("Error fetching history data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading };
}

// Hook สำหรับหน้า Profile
export function useProfileData(userId?: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const [profile, wasteStats] = await Promise.all([
          getUserProfile(userId),
          getUserWasteStats(userId),
        ]);

        setData({
          profile,
          wasteStats,
        });
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  return { data, loading };
}
