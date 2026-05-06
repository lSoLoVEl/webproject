import { supabase } from "./supabaseClient";

// ===== Profile & User Queries =====

export async function getUserProfile(userId: string) {
  try {
    const { data: user, error: userError } = await supabase
      .from("User")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (userError) throw userError;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError) throw profileError;

    return { user, profile };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

// ===== Daily Waste Summary =====

export async function getDailyWasteSummary() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("daily_waste_summary")
      .select("log_date, collected_count, missed_count, total_count")
      .eq("log_date", today)
      .single();

    if (error) {
      // ถ้าไม่มีข้อมูลวันนี้ ให้คืนค่าศูนย์
      return {
        log_date: today,
        collected_count: 0,
        missed_count: 0,
        total_count: 0,
      };
    }

    return data;
  } catch (error) {
    console.error("Error fetching daily waste summary:", error);
    return null;
  }
}

// ===== Weekly Summary =====

export async function getWeeklySummary(vesselId?: string) {
  try {
    let query = supabase
      .from("Weekly_Summary")
      .select(
        "summary_id, week_start, week_end, waste_type, total_amount, vessel_id"
      )
      .order("week_start", { ascending: false })
      .limit(1);

    if (vesselId) {
      query = query.eq("vessel_id", vesselId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data?.[0] || null;
  } catch (error) {
    console.error("Error fetching weekly summary:", error);
    return null;
  }
}

// ===== Waste Data for Today =====

export async function getWasteDataForToday() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("WasteData")
      .select("waste_id, Date, waste_type, amount, vessel_id")
      .eq("Date", today)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching waste data for today:", error);
    return [];
  }
}

// ===== Waste Data for This Week =====

export async function getWasteDataForWeek() {
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from("WasteData")
      .select("waste_id, Date, waste_type, amount, vessel_id")
      .gte("Date", weekAgo.toISOString().split("T")[0])
      .lte("Date", today.toISOString().split("T")[0])
      .order("Date", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching waste data for week:", error);
    return [];
  }
}

// ===== Trash Logs (for History/Stats) =====

export async function getTrashLogStats() {
  try {
    const { data, error } = await supabase
      .from("trash_logs")
      .select("is_correct, actual_class")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const correct = data?.filter((log) => log.is_correct).length || 0;
    const incorrect = (data?.length || 0) - correct;

    return {
      correct,
      incorrect,
      total: data?.length || 0,
      percentage: data?.length ? Math.round((correct / data.length) * 100) : 0,
    };
  } catch (error) {
    console.error("Error fetching trash log stats:", error);
    return { correct: 0, incorrect: 0, total: 0, percentage: 0 };
  }
}

// ===== User Waste Count Stats =====

export async function getUserWasteStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from("waste_logs")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    const thisWeek = data?.filter((log) => {
      const logDate = new Date(log.created_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return logDate >= weekAgo;
    }).length || 0;

    const lastWeek = data?.filter((log) => {
      const logDate = new Date(log.created_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      return logDate >= twoWeeksAgo && logDate < weekAgo;
    }).length || 0;

    return { thisWeek, lastWeek };
  } catch (error) {
    console.error("Error fetching user waste stats:", error);
    return { thisWeek: 0, lastWeek: 0 };
  }
}

// ===== Timeline Data (for History page) =====

export async function getWasteTimeline() {
  try {
    const { data, error } = await supabase
      .from("WasteData")
      .select("Date, waste_type, amount")
      .order("Date", { ascending: false })
      .limit(10);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching waste timeline:", error);
    return [];
  }
}
