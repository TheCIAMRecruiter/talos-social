// Shared TALOS email sign-in helper. Import this from the Approval Center.
export const TALOS_AUTH_CALLBACK = 'https://talossocial.com/auth/callback.html';
export async function sendTalosMagicLink(supabase, email) {
  const {error} = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: TALOS_AUTH_CALLBACK }
  });
  if (error) throw error;
}
