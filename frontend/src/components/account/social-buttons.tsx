/**
 * "Continue with Google / Facebook". Plain links: /auth/<provider> runs the redirect, so no Google or Facebook
 * scripts load on our pages. If a provider's keys aren't set yet, its route sends the shopper back with a notice.
 */
export function SocialButtons({ next, google, facebook, verb = "Continue" }: { next: string; google: boolean; facebook: boolean; verb?: string }) {
  if (!google && !facebook) return null;
  const href = (provider: string) => `/auth/${provider}?next=${encodeURIComponent(next)}`;
  const button = "flex h-12 w-full items-center justify-center gap-3 rounded-full text-[15px] font-medium transition-colors";
  return (
    <>
      <div className="flex flex-col gap-3">
        {google && (
          <a href={href("google")} className={`${button} border border-line-strong bg-white text-ink hover:bg-mist`}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            {verb} with Google
          </a>
        )}
        {facebook && (
          <a href={href("facebook")} className={`${button} bg-[#1877F2] text-white hover:bg-[#166FE5] hover:text-white`}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07z" />
            </svg>
            {verb} with Facebook
          </a>
        )}
      </div>
      <div className="my-6 flex items-center gap-4 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}
