import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "login_history_emails";
const MAX = 6;

/** Correos que ya iniciaron sesión en este dispositivo, para elegirlos
 * rápido en el login sin volver a escribirlos. */
export async function getLoginHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function addLoginHistory(email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (!clean) return;
  try {
    const current = await getLoginHistory();
    const next = [clean, ...current.filter((e) => e !== clean)].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* best-effort */
  }
}

export async function removeLoginHistory(email: string): Promise<string[]> {
  try {
    const current = await getLoginHistory();
    const next = current.filter((e) => e !== email);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}
