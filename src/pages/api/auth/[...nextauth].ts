import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

import { fauna } from "../../../services/fauna";
import { query as a } from "faunadb";

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "read:user",
        },
      },
    }),
  ],
  callbacks: {
    session: async ({ session }) => {
      try {
        const userActiveSubscription = await fauna.query(
          a.Get(
            a.Intersection([
              a.Match(
                a.Index("subscription_by_user_ref"),
                a.Select(
                  "ref",
                  a.Get(
                    a.Match(
                      a.Index("user_by_email"),
                      a.Casefold(session.user.email)
                    )
                  )
                )
              ),
              a.Match(a.Index("subscription_by_status"), "active"),
            ])
          )
        );
        return {
          ...session,
          activeSubscription: userActiveSubscription,
        };
      } catch {
        return {
          ...session,
          activeSubscription: null,
        };
      }
    },

    async signIn({ user, account, profile }) {
      const { email } = user;
      try {
        await fauna.query(
          a.If(
            a.Not(
              a.Exists(
                a.Match(a.Index("user_by_email"), a.Casefold(user.email))
              )
            ),
            a.Create(a.Collection("users"), { data: { email } }),
            a.Get(a.Match(a.Index("user_by_email"), a.Casefold(user.email)))
          )
        );
        return true;
      } catch {
        return false;
      }
    },
  },
});
