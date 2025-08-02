// Welcome to some authentication for Keystone
//
// This is using @keystone-6/auth to add the following
// - A sign-in page for your Admin UI
// - A cookie-based stateless session strategy
//    - Using a User email as the identifier
//    - 30 day cookie expiration
//
// This file does not configure what Users can do, and the default for this starter
// project is to allow anyone - logged-in or not - to do anything.
//
// If you want to prevent random people on the internet from accessing your data,
// you can find out how by reading https://keystonejs.com/docs/guides/auth-and-access-control
//
// If you want to learn more about how our out-of-the-box authentication works, please
// read https://keystonejs.com/docs/apis/auth#authentication-api

import { randomBytes } from "node:crypto";
import { createAuth } from "@keystone-6/auth";

// see https://keystonejs.com/docs/apis/session for the session docs
import { statelessSessions } from "@keystone-6/core/session";

const withAuth = createAuth({
  listKey: "User",
  identityField: "email",
  secretField: "password",
  sessionData: "name email",
});

const sessionMaxAge = 60 * 60 * 24 * 30;

const session = statelessSessions({
  maxAge: sessionMaxAge,
  secret: process.env.SESSION_SECRET,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});

export { withAuth, session };
