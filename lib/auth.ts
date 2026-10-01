// Server-side auth helper — wraps Clerk's auth() for convenience
// Use this for route handlers, server actions, and server components
export { auth, currentUser } from "@clerk/nextjs/server"