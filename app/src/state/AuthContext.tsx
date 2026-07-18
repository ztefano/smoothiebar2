import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/types";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    lastName: string;
    phone: string;
    role: UserRole;
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error) setProfile(data as Profile);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(params: {
    email: string;
    password: string;
    fullName: string;
    lastName: string;
    phone: string;
    role: UserRole;
  }) {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          last_name: params.lastName,
          phone: params.phone,
          role: params.role,
        },
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error("No se pudo crear el usuario.");

    // El perfil lo crea un trigger en la base de datos a partir de estos
    // metadatos (ver supabase/migrations/0002_auto_create_profile.sql), así
    // que funciona haya o no confirmación de email activada.
    if (data.session) {
      await loadProfile(data.user.id);
      return { needsEmailConfirmation: false };
    }
    return { needsEmailConfirmation: true };
  }

  async function signInWithGoogle() {
    // Volvemos a la raíz de la app (no a una ruta ficticia como
    // "auth/callback", que no existe como pantalla) para evitar que el
    // router intente resolverla como navegación y muestre "Unmatched
    // Route" por una fracción de segundo al volver del navegador.
    const redirectTo = Linking.createURL("/");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error("No se pudo iniciar el login con Google.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success") return; // el usuario canceló

    const url = new URL(result.url);
    const code = url.searchParams.get("code");
    if (!code) throw new Error("No se recibió el código de autenticación de Google.");

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
