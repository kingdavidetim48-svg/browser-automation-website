import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const memberships = await clerk.organizations.getOrganizationMembershipList({
  organizationId: "org_3K3ZKMB09enO0oCEK0hTT3RBCYh"
});
console.log("Members:", memberships.data.map(m => ({
  userId: m.publicUserData?.userId,
  email: m.publicUserData?.identifier
})));
