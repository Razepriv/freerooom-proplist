export interface SessionData {
  username?: string;
  isLoggedIn: boolean;
}

export const sessionOptions = {
  cookieName: 'propscrapeai_session',
  password: process.env.IRON_SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};
