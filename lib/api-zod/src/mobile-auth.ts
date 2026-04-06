import { z } from "zod/v4";

export const ExchangeMobileAuthorizationCodeBody = z.object({
  code: z.string(),
  code_verifier: z.string(),
  redirect_uri: z.string(),
  state: z.string(),
  nonce: z.string().optional().nullable(),
});

export const ExchangeMobileAuthorizationCodeResponse = z.object({
  token: z.string(),
});

export const LogoutMobileSessionResponse = z.object({
  success: z.boolean(),
});

export type ExchangeMobileAuthorizationCodeBodyType = z.infer<typeof ExchangeMobileAuthorizationCodeBody>;
export type ExchangeMobileAuthorizationCodeResponseType = z.infer<typeof ExchangeMobileAuthorizationCodeResponse>;
export type LogoutMobileSessionResponseType = z.infer<typeof LogoutMobileSessionResponse>;
