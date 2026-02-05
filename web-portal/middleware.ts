import { withAuth } from 'next-auth/middleware';

// Protect routes that require authentication
export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: '/',
  },
});

// Specify which routes to protect
export const config = {
  matcher: ['/chat/:path*'],
};
