import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const users = await clerk.users.getUserList();
console.log("Users:", users.data.map(u => ({ id: u.id, email: u.emailAddresses[0]?.emailAddress })));

if (users.data[0]) {
  try {
    const token = await clerk.signInTokens.createSignInToken({ userId: users.data[0].id });
    console.log("SignInToken created successfully:", token);
  } catch (err) {
    console.error("SignInToken error:", err.message);
  }
}
